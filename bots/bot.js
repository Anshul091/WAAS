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
            break;
        }
        limit *= 2;
        cur_timestamp = messages[0].timestamp;
    }
    let ind = 0;
    for (let message of messages){
        if (message.timestamp <= time){
            ind++;
        }
        else break;
    }
    console.log(ind, messages.length);
    for(let message of messages){
        console.log(message.body);
    }
    const messagesAfterTime = messages.slice(ind);
    console.log('message - ' +  messagesAfterTime.length);
    for(let message of messagesAfterTime){
        console.log(message.body);
    }
    return messagesAfterTime;
}


// Convert unix to DateTimeField

function unix2DateTime(unixTimestamp) {
    const date = new Date(unixTimestamp);

// Extract date components
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-indexed, so January is 0
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

    // Construct the datetimeField string in the format expected
    let datetimeField = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
    return datetimeField;
}

function saveNewMessage(data) {
    db.serialize(() => {
        db.run(`INSERT INTO home_botmessage (botid, chatid, message, isgroup, seen_cnt, read_cnt, timestamp) VALUES(?,?,?,?,?,?,?)`, [data.botid, data.chatid, data.message, data.isgroup, data.seen_cnt, data.read_cnt, data.timestamp], function (err) {
            if (err) {
                return console.log(err.message);
            }
            // get the last insert id
            console.log(`A row has been inserted with rowid ${this.lastID}`);
        });
    });
}
function saveNewMessageLog(data) {
    let table = "home_botmessage";
    let sql = `INSERT INTO ${table} (botid, chatid, message, isgroup, seen_cnt, read_cnt, timestamp) VALUES `;
    let querstionParameters = `(?, ?, ?, ?, ?, ?, ?)`;
    for (let i = 0; i < data.length; i++) {
        sql += querstionParameters;
        if (i < data.length - 1) {
            sql += ', ';
        }
    }
    parameters = [];
    for (let message of data) {
        parameters.push(message.botid, message.chatid, message.message, message.isgroup, message.read_cnt, message.seen_cnt, message.timestamp);
