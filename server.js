const express = require("express");
const app = express();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { Pool, Client } = require("pg");
const  https = require('https');

const cors = require("cors");

const port = 3000;
const fs = require("fs");

const tesseract = require("node-tesseract-ocr");

const config = {
  lang: "eng",
  oem: 1,
  psm: 3,
};

const pool = new Pool({
  user: "postgres",
  host: "172.17.0.2",
  database: "postgres",
  password: "postgres",
  port: 5432,
});

// const client = new Client({
//   user: 'postgres',
//   host: '172.17.0.2',
//   database: 'postgres',
//   password: 'postgres',
//   port: 5432,
// })
// client.connect()

const img = fs.readFileSync("folder/2.png");
const vinReg = /[A-Z]{3}[0-9]{14}/;

var options = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem'),
};






app.use(
  cors({
    credentials: true,
    methods: "GET, POST, PUT, DELETE",
    headers: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    origin: "*",
  })
);

app.get("/", (req, res) => {
  res.send("Health runner!");
});

app.post("/upload", upload.single("document"), function (req, res, next) {
  console.log(req.file);
  console.log(req.body);
  tesseract
    .recognize(req.file.buffer, config)
    .then((text) => {
      console.log(text);
      const resp = text.match(vinReg);
      console.log(resp);
      if (resp && resp[0]) {
        const truck = resp[0];
        const location = req.body.data;
        pool.connect((err, client, done) => {
          if (err) throw err;
          client.query(
            `update sample set location='${location}' where truck_id='${truck}'`,
            (err, res1) => {
              client.release();
              if (err) {
                console.log(err.stack);
                res.status(500).send();
              } else {
                res.status(200).send({truck, location});
              }
            }
          );
        });
        // res.status(200).send(resp[0]);
      } else {
        res.status(404).send();
      }
    })
    .catch((error) => {
      res.status(500).send();
      console.log(error.message);
    });
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
});

app.get("/ocr", (req, res) => {
  tesseract
    .recognize(img, config)
    .then((text) => {
      console.log(text);
      const resp = text.match(vinReg);
      console.log(resp);
      if (resp[0]) {
        res.send(resp[0]);
      } else {
        res.status(404).send();
      }
    })
    .catch((error) => {
      res.status(500).send();
      console.log(error.message);
    });
});

app.get("/db", (req, resp) => {
  console.log(req.query.search);
  if (req.query && !req.query.search) {
    resp.status(404).send();
  }

  pool.connect((err, client, done) => {
    if (err) throw err;
    client.query(
      `select truck_id, location from sample where info->'${req.query.search}'='false' LIMIT 3`,
      (err, res) => {
        client.release();
        if (err) {
          console.log(err.stack);
          resp.status(500).send();
        } else {
          resp.send(res.rows);
        }
      }
    );
  });
});


app.listen(port, function(){
  console.log("Express server listening on port " + port);
});



