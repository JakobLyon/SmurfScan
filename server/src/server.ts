// Server for SmurfScan

import express, { type Request, type Response } from "express";
const app = express();
const port = 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("web app here");
});

app.get("/api", (req: Request, res: Response) => {
  res.send("smurf index and player stats");
});
