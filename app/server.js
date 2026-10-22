const express = require("express");
const os = require("os");
const app = express();
const port = Number(process.env.PORT || 3000);
const version = process.env.APP_VERSION || "v1";
app.get("/", (_req, res) =>
    res.json({
        mensaje: "Hola desde Kubernetes",
        version,
        pod: os.hostname(),
        fecha: new Date().toISOString(),
    }),
);
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.listen(port, "0.0.0.0", () => console.log(`API ${version} en ${port}`));
