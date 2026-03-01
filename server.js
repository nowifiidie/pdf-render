const express = require("express");
const puppeteer = require("puppeteer-core");

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;
const CHROME_BIN = process.env.CHROME_BIN || "/usr/bin/chromium";

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/render", async (req, res) => {
  const { html, url, options } = req.body || {};

  if (!html && !url) {
    return res.status(400).json({ error: "Provide html or url" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_BIN,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(15000);
    page.setDefaultTimeout(15000);

    if (url) {
      await page.goto(url, { waitUntil: "networkidle0" });
    } else {
      await page.setContent(html, { waitUntil: "networkidle0" });
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "14mm", bottom: "14mm", left: "14mm" },
      ...(options || {})
    });

    const pdfBytes = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);

    res.status(200);


    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="dop.pdf"'); // or attachment
    res.setHeader("Content-Length", pdfBytes.length);
    res.setHeader("Cache-Control", "no-store");


    console.log("pdf type:", typeof pdf);
    console.log("isBuffer:", Buffer.isBuffer(pdf));
    console.log("constructor:", pdf?.constructor?.name);
    console.log("length:", pdf?.length ?? pdf?.byteLength);
    console.log("first 8 bytes:", Buffer.from(pdf).subarray(0, 8));


    return res.end(pdfBytes);



  } catch (e) {
    console.error("Render error:", e);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Render failed", message: String(e?.message || e) });
    }
  } finally {
    if (browser) {
      try { await browser.close(); } catch { }
    }
  }
});

app.listen(PORT, () => {
  console.log("PDF renderer running on port", PORT);
});