import { describe, expect, it } from "vitest";
import {
  EMAIL_COLORS,
  emailButton,
  emailLabel,
  emailLayout,
  emailList,
  emailNote,
  emailParagraph,
  emailPersonRows,
  emailRows,
  emailStrong,
} from "./email-layout";

describe("emailLayout", () => {
  it("wraps the body in the branded shell with the standard footer", () => {
    const html = emailLayout({ eyebrow: "Payment sent", title: "₹820", body: "<p>BODY</p>" });
    expect(html).toContain(">tally</span>");
    expect(html).toContain("Payment sent");
    expect(html).toContain("₹820");
    expect(html).toContain("<p>BODY</p>");
    expect(html).toContain("please do not reply");
    expect(html).toContain(EMAIL_COLORS.page);
    expect(html).toContain("text-align:left");
  });

  it("only renders the optional parts that are given", () => {
    const bare = emailLayout({ eyebrow: "e", title: "t", body: "" });
    expect(bare).not.toContain("border-radius:50%");
    expect(bare).not.toContain("border-radius:999px");

    const full = emailLayout({
      eyebrow: "e",
      title: "t",
      titleSize: "lg",
      subtitle: "SUB",
      badge: "B",
      chip: "CHIP",
      align: "center",
      footer: "FOOT",
      body: "",
    });
    expect(full).toContain("font-size:30px");
    expect(full).toContain("SUB");
    expect(full).toContain(">B</div>");
    expect(full).toContain("CHIP");
    expect(full).toContain("FOOT");
    expect(full).toContain("text-align:center");
  });

  it("uses no colours from the old pine palette", () => {
    const html = emailLayout({ eyebrow: "e", title: "t", body: emailButton("https://x.test", "Go") });
    for (const old of ["#1c6b52", "#22795d", "#155741", "#eef2ec"]) expect(html).not.toContain(old);
  });
});

describe("emailButton", () => {
  it("escapes the link for the attribute", () => {
    const html = emailButton('https://tally.test/join/a"b&c', "Join");
    expect(html).toContain('href="https://tally.test/join/a&quot;b&amp;c"');
    expect(html).toContain(">Join</a>");
  });

  it("refuses non-http links and renders the label as text", () => {
    const html = emailButton("javascript:alert(1)", "Open");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("javascript:");
    expect(html).toContain(">Open</p>");
  });
});

describe("emailRows and emailPersonRows", () => {
  it("renders one row per item with an optional value colour", () => {
    const html = emailRows([
      { label: "You owe", value: "₹10", color: EMAIL_COLORS.negative },
      { label: "Across", value: "2 people" },
    ]);
    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html).toContain(`color:${EMAIL_COLORS.negative}`);
    expect(html).toContain(`color:${EMAIL_COLORS.ink}`);
  });

  it("escapes names and derives the initial", () => {
    const html = emailPersonRows([{ name: "<b>eve</b>", value: "₹5" }]);
    expect(html).toContain("&lt;b&gt;eve&lt;/b&gt;");
    expect(html).toContain(">&lt;</span>");
    expect(emailPersonRows([{ name: "  ", value: "₹0" }])).toContain(">?</span>");
  });
});

describe("text helpers", () => {
  it("wrap content in their styled elements", () => {
    expect(emailParagraph("hi")).toMatch(/^<p .*>hi<\/p>$/);
    expect(emailNote("n", "center")).toContain("text-align:center");
    expect(emailStrong("Riya")).toBe(`<b style="color:${EMAIL_COLORS.ink};">Riya</b>`);
    expect(emailLabel("Who paid")).toContain("text-transform:uppercase");
    expect(emailList([{ icon: "⚡", text: "Fast" }])).toContain("⚡</span> Fast");
  });
});
