"use client";

import { Fragment, type ReactNode } from "react";
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

/**
 * 递归渲染 MiniMessage 组件树（样式已在反序列化时解析到各节点）。
 * sprite/selector 等游戏端专属组件（object 类型）在网页中无对应展示，跳过。
 */
function renderComponent(
  component: Component,
  parentCss: React.CSSProperties,
  keyPrefix: string,
): ReactNode {
  if (component.type === "object") {
    return null;
  }
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
    const rendered = renderComponent(child, css, `${keyPrefix}-${index}`);
    if (rendered !== null) {
      // 统一包一层带 key 的 Fragment，避免列表子项缺 key
      nodes.push(
        <Fragment key={`${keyPrefix}-c${index}`}>{rendered}</Fragment>,
      );
    }
  });

  if (nodes.length === 0) {
    return null;
  }
  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

/**
 * 按顶层 legacy 码（&a/§a/&#hex）把混合文本切段。
 * 只在 MiniMessage 标签之外的码处切分（legacy 码语义为重置再设样式，段间样式独立）。
 */
function splitByTopLevelLegacy(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  let tagDepth = 0;
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];
    const atTagLevel = tagDepth === 0;
    const isLegacyCode =
      (atTagLevel &&
        (char === "§" || char === "&") &&
        next !== undefined &&
        /[0-9a-fk-orx]/i.test(next)) ||
      (atTagLevel &&
        char === "&" &&
        /^&#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/.test(text.slice(index)));
    if (isLegacyCode && index > 0) {
      parts.push(current);
      current = "";
    }
    if (char === "<") {
      tagDepth += 1;
    } else if (char === ">" && tagDepth > 0) {
      tagDepth -= 1;
    }
    current += char;
    index += 1;
  }
  parts.push(current);
  return parts;
}

/** 剥离段首连续的 legacy 码（&a/§a/&#hex），返回 { prefix, rest }。 */
function stripLeadingLegacyCodes(segment: string): { prefix: string; rest: string } {
  const match = /^((?:[§&][0-9a-fk-orx]|&#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))*)/.exec(
    segment,
  );
  const prefix = match ? match[1] : "";
  return { prefix, rest: segment.slice(prefix.length) };
}

/** 由 legacy 码前缀推导基础样式（取最后一个颜色码 + 装饰码叠加）。 */
function legacyPrefixStyle(prefix: string): React.CSSProperties {
  const segments = parseLegacy(`${prefix}x`);
  const segment = segments[segments.length - 1];
  return segment ? legacyStyle({ ...segment, text: "" }) : {};
}

/** 渲染单个片段：剥离段首 legacy 码作为基础样式，剩余按 MiniMessage / legacy / 纯文本渲染。 */
function renderSegment(segment: string, key: number): ReactNode {
  const { prefix, rest } = stripLeadingLegacyCodes(segment);

  if (MINI_TAG_PATTERN.test(rest)) {
    let component: Component | null = null;
    try {
      component = MINI_MESSAGE.deserialize(rest);
    } catch {
      component = null;
    }
    if (component) {
      const baseStyle = legacyPrefixStyle(prefix);
      const rendered = renderComponent(component, baseStyle, `mini-${key}`);
      if (rendered !== null) {
        return <span key={`mini-${key}`}>{rendered}</span>;
      }
    }
    return <span key={`raw-${key}`}>{segment}</span>;
  }

  if (LEGACY_CODE_PATTERN.test(segment)) {
    const segments = parseLegacy(segment);
    if (segments.length === 1) {
      return (
        <span key={`legacy-${key}`} style={legacyStyle(segments[0])}>
          {segments[0].text}
        </span>
      );
    }
    return (
      <span key={`legacy-${key}`}>
        {segments.map((legacySegment, index) => (
          <span key={index} style={legacyStyle(legacySegment)}>
            {legacySegment.text}
          </span>
        ))}
      </span>
    );
  }

  if (prefix) {
    const style = legacyPrefixStyle(prefix);
    return (
      <span key={`plain-${key}`} style={style}>
        {rest}
      </span>
    );
  }

  return <span key={`plain-${key}`}>{segment}</span>;
}

/** 渲染可能包含 Minecraft 颜色代码（MiniMessage、&/§ legacy、&#hex 及其混合）的文本。 */
export function McText({ text }: { text: string }) {
  if (!text) {
    return null;
  }

  // 混合格式（legacy 码与 MiniMessage 标签共存）：按顶层 legacy 码分段后逐段渲染
  const hasMiniTag = MINI_TAG_PATTERN.test(text);
  if (hasMiniTag) {
    const withoutHexCodes = text.replace(
      /&#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g,
      "",
    );
    if (/[§&][^<]*</.test(withoutHexCodes)) {
      const parts = splitByTopLevelLegacy(text);
      if (parts.length > 1) {
        return <>{parts.map((part, index) => renderSegment(part, index))}</>;
      }
    }
  }

  return <>{renderSegment(text, 0)}</>;
}

/**
 * 把可能含 Minecraft 颜色代码的多行文本拆成非空行。
 *
 * 兼容两种存储形态（插件不同、写入方式不同，不假设固定格式）：
 * - JSON 数组字符串：["&7---", "&7恭喜...", "&7---"]
 * - \n 分隔的多行纯文本
 * 仅过滤纯空白行，不过滤任何业务内容（如游戏内的装饰分隔线 &7------）。
 */
function splitMcLines(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter((line) => line.length > 0);
      }
    } catch {
      // 不是合法 JSON，回退按 \n 拆分
    }
  }
  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * 渲染含 Minecraft 颜色代码的多行文本（message / command 字段通用）。
 * 逐行用 McText 渲染，长行自动换行，颜色代码正确着色，分隔线原样保留。
 */
export function McMessage({ text }: { text: string | null }) {
  if (!text) {
    return <span className="text-muted-foreground">—</span>;
  }
  const lines = splitMcLines(text);
  if (lines.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {lines.map((line, index) => (
        <div key={index} className="whitespace-pre-wrap break-words">
          <McText text={line} />
        </div>
      ))}
    </div>
  );
}
