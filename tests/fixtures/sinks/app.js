// Fixture for tests/smoke.mjs — every line below should be reported as a candidate.
// It is intentionally vulnerable and is never executed.
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

function handler(req, res) {
  exec(`git log ${req.query.ref}`);                       // rce: shell exec with interpolation
  eval(req.body.code);                                    // rce: dynamic eval
  db.query(`SELECT * FROM users WHERE id = ${req.query.id}`); // sqli: template literal
  fs.readFile(path.join("/srv", req.query.file), () => {});   // path: fs on input
  return res.send("ok");
}

module.exports = { handler };