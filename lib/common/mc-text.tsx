"use client";

import type { ReactNode } from "react";
import {
  MiniMessage,
  TextDecoration,
  type Component,
  type Style,
} from "minimessage-js";

/**
 * Minecraft 富文本渲染。
 *
 * - MiniMessage 格式（<red>、<gradient:#f00:#0f0>、<rainbow> 等）：
 *   由 minimessage-js 反序列化为组件树后直接渲染 React 节点（无 innerHTML，无注入风险）
 * - Legacy 颜色代码（&a / §a）：内置解析器，仅匹配标准代码字符
 * - 其余文本按原样渲染
 *
 * 注意：颜色是数据库内容本身（游戏内文本），因此使用内联样式而非语义变量。
 */

const MINI_MESSAGE = MiniMessage.miniMessage();

/** 检测 MiniMessage 标签（如 <red>、</gradient>、<#ff0000>）。 */
const MINI_TAG_PATTERN = /<\/?[a-zA-Z#][a-zA-Z0-9_:#,.\s%'-]*>/;

/** 检测 legacy 颜色代码（&a / §a / &#RRGGBB / &#RGB）。 */
const LEGACY_CODE_PATTERN = /[§&][0-9a-fk-orx]|&#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/;

/** 短 hex（3 位）扩展为 6 位，每位字符翻倍（对应 Java 端 doubleCharacters）。 */
function expandShortHex(hex: string): string {
  return hex.length === 3
    ? hex
        .split("")
        .map((char) => char + char)
        .join("")
    : hex;
}

const LEGACY_COLORS: Record<string, string> = {
  "0": "#000000",
  "1": "#0000aa",
  "2": "#00aa00",
  "3": "#00aaaa",
  "4": "#aa0000",
  "5": "#aa00aa",
  "6": "#ffaa00",
  "7": "#aaaaaa",
  "8": "#555555",
  "9": "#5555ff",
  a: "#55ff55",
  b: "#55ffff",
  c: "#ff5555",
  d: "#ff55ff",
  e: "#ffff55",
  f: "#ffffff",
};

interface LegacySegment {
  text: string;
  color: string | null;
  bold: boolean;
  italic: boolean;
  underlined: boolean;
  strikethrough: boolean;
}

/** 解析 legacy 颜色代码文本为样式片段。 */
function parseLegacy(text: string): LegacySegment[] {
  const segments: LegacySegment[] = [];
  let current: LegacySegment = {
    text: "",
    color: null,
    bold: false,
    italic: false,
    underlined: false,
    strikethrough: false,
  };
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    // &#RRGGBB / &#RGB 十六进制颜色（PlayerTitle 的 RPG 格式）
    if (char === "&" && next === "#") {
      const hexMatch = /^&#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/.exec(
        text.slice(index),
      );
      if (hexMatch) {
        const hex = expandShortHex(hexMatch[1]);
        if (current.text) {
          segments.push(current);
        }
        current = {
          text: "",
          color: `#${hex.toLowerCase()}`,
          bold: false,
          italic: false,
          underlined: false,
          strikethrough: false,
        };
        index += hexMatch[0].length;
        continue;
      }
    }

    if (
      (char === "§" || char === "&") &&
      next !== undefined &&
      /[0-9a-fk-orx]/i.test(next)
    ) {
      const code = next.toLowerCase();
      if (code === "r") {
        if (current.text) {
          segments.push(current);
        }
        current = {
          text: "",
          color: null,
          bold: false,
          italic: false,
          underlined: false,
          strikethrough: false,
        };
      } else if (code in LEGACY_COLORS) {
        if (current.text) {
          segments.push(current);
        }
        current = {
          text: "",
          color: LEGACY_COLORS[code],
          bold: current.bold,
          italic: current.italic,
          underlined: current.underlined,
          strikethrough: current.strikethrough,
        };
      } else {
        // 装饰代码
        if (current.text) {
          segments.push(current);
        }
        current = {
          ...current,
          text: "",
          bold: current.bold || code === "l",
          italic: current.italic || code === "o",
          underlined: current.underlined || code === "n",
          strikethrough: current.strikethrough || code === "m",
        };
      }
      index += 2;
      continue;
    }
    current.text += char;
    index += 1;
  }
  if (current.text) {
    segments.push(current);
  }
  return segments;
}

function legacyStyle(segment: LegacySegment): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (segment.color) {
    style.color = segment.color;
  }
  if (segment.bold) {
    style.fontWeight = 700;
  }
  if (segment.italic) {
    style.fontStyle = "italic";
  }
  const decorations: string[] = [];
  if (segment.underlined) {
    decorations.push("underline");
  }
  if (segment.strikethrough) {
    decorations.push("line-through");
  }
  if (decorations.length > 0) {
    style.textDecorationLine = decorations.join(" ");
  }
  return style;
}

function componentStyle(style: Style): React.CSSProperties {
  const css: React.CSSProperties = {};
  const color = style.color();
  if (color) {
    css.color = color.asHexString();
  }
  const decorations = style.decorations();
  if (decorations[TextDecoration.BOLD] === "true") {
    css.fontWeight = 700;
  }
  if (decorations[TextDecoration.ITALIC] === "true") {
    css.fontStyle = "italic";
  }
  const lines: string[] = [];
  if (decorations[TextDecoration.UNDERLINED] === "true") {
    lines.push("underline");
  }
  if (decorations[TextDecoration.STRIKETHROUGH] === "true") {
    lines.push("line-through");
  }
  if (lines.length > 0) {
    css.textDecorationLine = lines.join(" ");
  }
  return css;
}

/** 递归渲染 MiniMessage 组件树（样式已在反序列化时解析到各节点）。 */
function renderComponent(
  component: Component,
  parentCss: React.CSSProperties,
  keyPrefix: string,
): ReactNode {
  const css = { ...parentCss, ...componentStyle(component.style()) };
  const children = component.children();
  const content =
    component.type === "text" &&
    typeof (component as { content?: () => string }).content === "function"
      ? (component as unknown as { content: () => string }).content()
      : "";

  const nodes: ReactNode[] = [];
  if (content) {
    nodes.push(
      <span key={`${keyPrefix}-t`} style={css}>
        {content}
      </span>,
    );
  }
  children.forEach((child, index) => {
    nodes.push(renderComponent(child, css, `${keyPrefix}-${index}`));
  });

  if (nodes.length === 0) {
    return null;
  }
  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

/** 渲染可能包含 Minecraft 颜色代码（MiniMessage 或 &/§ legacy）的文本。 */
export function McText({ text }: { text: string }) {
  if (!text) {
    return null;
  }

  if (MINI_TAG_PATTERN.test(text)) {
    let component: Component | null = null;
    try {
      component = MINI_MESSAGE.deserialize(text);
    } catch {
      component = null;
    }
    if (component) {
      const rendered = renderComponent(component, {}, "root");
      if (rendered !== null) {
        return <>{rendered}</>;
      }
    }
    return <>{text}</>;
  }

  if (LEGACY_CODE_PATTERN.test(text)) {
    const segments = parseLegacy(text);
    if (segments.length === 1) {
      return <span style={legacyStyle(segments[0])}>{segments[0].text}</span>;
    }
    return (
      <>
        {segments.map((segment, index) => (
          <span key={index} style={legacyStyle(segment)}>
            {segment.text}
          </span>
        ))}
      </>
    );
  }

  return <>{text}</>;
}
