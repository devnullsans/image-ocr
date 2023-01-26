import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors());

app.post("/ocr", [
  express.json({ limit: process.env.JSON_LIMIT ?? "16mb" }),
  async (req, res) => {
    console.log(req.method, req.url, req.body?.isDoc, req.body?.imgB64?.length, Date.now());
    try {
      const { isDoc, imgB64 } = req.body;
      if (!imgB64 || typeof imgB64 !== "string")
        return res.status(400).json({ error: "Bad Request Server rejected the data" });
      const ocr = await fetch(
        "https://vision.googleapis.com/v1/images:annotate?key=" + process.env.VISION_APIKEY ?? "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imgB64
                },
                features: [
                  {
                    model: "builtin/stable",
                    type: Boolean(isDoc) ? "DOCUMENT_TEXT_DETECTION" : "TEXT_DETECTION"
                  }
                ],
                imageContext: {
                  languageHints: ["en"]
                }
              }
            ]
          })
        }
      );
      const { error, responses } = await ocr.json();
      if (ocr.ok) {
        const data = Boolean(isDoc)
          ? responses.flatMap((res) =>
              res.fullTextAnnotation.pages.flatMap((page) =>
                page.blocks.flatMap((block) =>
                  block.paragraphs
                    .map((para) =>
                      para.words
                        .filter(
                          (word) =>
                            word.confidence > (process.env.OCR_CONFIDENCE ? Number(process.env.OCR_CONFIDENCE) : 0.8)
                        )
                        .flatMap((word) => word.symbols.map((sym) => sym.text).join(""))
                        .join(" ")
                    )
                    .filter(Boolean)
                )
              )
            )
          : responses.map((res) => res.fullTextAnnotation.text);
        res.status(ocr.status).json({ data });
      } else {
        res.status(ocr.status).json({ error: error.message });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
]);

app.use([
  (req, _, next) => console.log(req.method, req.url, Date.now()) ?? next(),
  express.static("./public"),
  (req, res, next) => (req.method === "GET" ? res.redirect(307, "/") : next())
]);

app.listen(process.env.SERVER_PORT ?? 8000, process.env.SERVER_HOST ?? "localhost", () =>
  console.log(`http://${process.env.SERVER_HOST ?? "localhost"}:${process.env.SERVER_PORT ?? 8000}`)
);
