import { describe, expect, it } from "vitest";

import { commentHtmlToText } from "../../src/js/features/page-widgets/comment-preview";

describe("comment previews", () => {
  it("converts paragraphs, breaks, links and entities to readable text", () => {
    expect(
      commentHtmlToText(
        '<p>打个广告<br /><a target="_blank" href="https://example.com">主页</a> | 青 &amp; 白</p><p>你好&nbsp;😀</p>',
      ),
    ).toBe("打个广告 主页 | 青 & 白 你好 😀");
  });

  it("keeps literal code and comparison characters without interpreting them again", () => {
    expect(commentHtmlToText("<p>1 &lt; 2；示例 <code>&lt;p&gt;hello&lt;/p&gt;</code></p>")).toBe(
      "1 < 2；示例 <p>hello</p>",
    );
  });

  it("discards active content and attributes while preserving visible labels", () => {
    expect(
      commentHtmlToText(
        '<script>alert(1)</script><style>body{display:none}</style><template>hidden</template><iframe src="https://evil.invalid">hidden</iframe><svg><text>hidden</text></svg><p onclick="alert(1)">正常 <a href="javascript:alert(1)">文字</a></p>',
      ),
    ).toBe("正常 文字");
  });

  it("represents emoji and image-only comments without loading their sources", () => {
    expect(
      commentHtmlToText(
        '<p><img src="https://unreachable.invalid/emoji.png" alt="[微笑]" onerror="alert(1)"><img src="/upload/photo.png"></p>',
      ),
    ).toBe("[微笑] [图片]");
  });

  it("handles malformed HTML, lists, plain text and empty comments", () => {
    expect(commentHtmlToText("<p>没有闭合 <strong>标签<p>下一段")).toBe("没有闭合 标签 下一段");
    expect(commentHtmlToText("<ul><li>第一项</li><li>第二项</li></ul>")).toBe("第一项 第二项");
    expect(commentHtmlToText("普通评论 😀")).toBe("普通评论 😀");
    expect(commentHtmlToText("")).toBe("");
  });
});
