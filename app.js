const express = require("express");
const app = express();
app.use(express.json());
app.use("/loja", require("./routes/estoque"));
module.exports = app;