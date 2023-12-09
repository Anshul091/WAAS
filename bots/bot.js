require('dotenv').config();
const { Client, List, Buttons, Contact, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { get } = require('request');
const { time } = require('console');
const sqlite3 = require('sqlite3').verbose();


require('dotenv').config();
const { Client, List, Buttons, Contact, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { get } = require('request');
const { time } = require('console');
const sqlite3 = require('sqlite3').verbose();


var db = new sqlite3.Database('./waas/db.sqlite3', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the my database.');
});


const PORT = process.env.HOST_PORT;
const DJANGO_URL = process.env.DJANGO_URL;
console.log("DJANGO_URL: " + DJANGO_URL);
console.log("PORT: " + PORT);

// helper function to save the new message to the database

async function getLatestMessagesAfterTimestamp(client, chatid, time) {
    console.log('chatid - ' + chatid);
    console.log(time);
    let chat = await client.getChatById(chatid);
    let limit = 10;
    let cur_timestamp = Math.floor(Date.now()/1000);
    let messages = [];
    console.log(cur_timestamp, time, cur_timestamp > time);
    while(cur_timestamp > time){
        messages = await chat.fetchMessages({ limit: limit , fromMe: false});
        // The chat doesn't have enough messages.
        if(messages.length <= limit){
