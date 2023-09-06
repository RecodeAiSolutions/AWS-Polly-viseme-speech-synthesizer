const debug = require("debug")("polly-viseme-generator:server");
const express = require("express");
const AWS = require("aws-sdk");
const fs = require("fs");
const util = require("util");

// Set the region
AWS.config.update({ region: "us-east-1" });

// Create an Polly client
const polly = new AWS.Polly({ region: "us-east-1" });

const router = express.Router();

// Promisify the startSpeechSynthesisTask method
const startSpeechSynthesisTaskAsync = util.promisify(
  polly.startSpeechSynthesisTask.bind(polly)
);

const synthesizeSpeechAsync = util.promisify(
  polly.synthesizeSpeech.bind(polly)
);

router.post("/", async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        message: "Parameter missing",
        error: "Bad request",
      });
    }

    const taskList = [
      startSpeechSynthesisTaskAsync({
        OutputFormat: "mp3",
        Text: text,
        VoiceId: "Joanna",
        OutputS3BucketName: "virtual-job-fair-file",
      }),
      synthesizeSpeechAsync({
        OutputFormat: "json",
        SpeechMarkTypes: ["viseme"],
        Text: text,
        VoiceId: "Joanna",
      }),
    ];

    const response = await Promise.all(taskList);

    const audioStreamBuffer = Buffer.from(response[1].AudioStream);
    const visemeText = audioStreamBuffer
      .toString("utf-8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line));

    res.status(200).json({
      audio: response[0],
      viseme: visemeText,
    });
  } catch (error) {
    console.log("Error: ", error);
    debug(error);
    res.status(500).json({
      message: "Internal server error",
      error,
    });
  }
});

module.exports = router;
