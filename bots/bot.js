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
    }

    return new Promise((resolve, reject) => {
        db.run(sql, parameters, function(err) {
            if (err) {
                reject(err.message);
            } else {
                resolve(`New log inserted for chatid: ${data.chatid}`);
            }
        });
    });
}

function isGroup(message) {
    return (typeof (message.author) != "undefined");
}

async function fetchAllGroups(client) {
    const chats = await client.getChats();    // Bug in this: If user logs out immediately after login, this line will cause error
    const groups = chats.filter(chat => chat.isGroup);
    let res = [];
    for (const group of groups) {
        try {
            let des = "";
            if (group.description) {
                des = group.description;
            }
            let participants_mobile = [];
            for (const participant of group.participants) {
                participants_mobile.push(participant.id.user);
            }
            let participants_mobile_str = participants_mobile.join(",");
            res.push({
                "id": group.id._serialized,
                "name": group.name,
                "description": des,
                "owner": group.owner ? group.owner._serialized : "No owner found",    // TODO: handle "No owner found
                "participants_size": group.participants.length,
                "participants": participants_mobile_str,
            });
            // console.log(res[res.length - 1]);
        } catch (err) {
            console.log(err);
        }
    }
    return res;
}

async function getMobileNumber(client) {
    let me = await client.info;
    return me.wid.user;
}

async function getMobileFromDatabase(id) {
    let table = "home_bot";
    let sql = `SELECT * FROM ${table} WHERE id = '${id}'`;

    return new Promise((resolve, reject) => {
        db.get(sql, (err, row) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(row ? row.mobile : null);
            }
        });
    });
}

async function updateMobileInDatabase(id, mobile) {
    let table = "home_bot";
    let sql = `UPDATE ${table} SET mobile = '${mobile}' WHERE id = '${id}'`;

    return new Promise((resolve, reject) => {
        db.run(sql, function(err) {
            if (err) {
                reject(err.message);
            } else {
                resolve(`Mobile number updated for ID: ${id}`);
            }
        });
    });
}


async function getLatestLogFromDatabase(chatid) {
    let table = "home_grouplog";
    let sql = `SELECT * FROM ${table} WHERE chatid = '${chatid}' ORDER BY timestamp DESC LIMIT 1`;

    return new Promise((resolve, reject) => {
        db.get(sql, (err, row) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(row ? row : null);
            }
        });
    });
}

function insertNewLog(data) {
    let table = "home_grouplog";
    let sql = `INSERT INTO ${table} (chatid, name, participants_size, participants, timestamp, owner) VALUES (?, ?, ?, ?, ?, ?)`;

    return new Promise((resolve, reject) => {
        db.run(sql, [data.chatid, data.name, data.participants_size, data.participants, data.timestamp, data.owner], function(err) {
            if (err) {
                reject(err.message);
            } else {
                resolve(`New log inserted for chatid: ${data.chatid}`);
            }
        });
    });
}


function isSameDate(d1_iso_string, d2_iso_string) {
    let d1 = new Date(d1_iso_string);
    let d2 = new Date(d2_iso_string);
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

