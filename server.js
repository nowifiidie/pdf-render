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
    await page.setViewport({ width: 1240, height: 1754 });

    if (url) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
    } else {
      await page.setContent(html, { waitUntil: "domcontentloaded" });
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "14mm",
        bottom: "14mm",
        left: "14mm"
      }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Render failed" });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log("PDF renderer running on port", PORT);
});