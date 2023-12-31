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


async function saveNewLog(currentLogs){
    // Save the latest group log to database
    let curDate = new Date().toISOString();
    let groups = currentLogs;
    for (const group of groups) {
        let log = await getLatestLogFromDatabase(group.id);
        if (!log || !isSameDate(log.timestamp, curDate)) {
            let newLog = {
                "chatid": group.id,
                "name": group.name,
                "participants_size": group.participants_size,
                "participants": group.participants,
                "timestamp": curDate,
                "owner": group.owner,
            }
            insertNewLog(newLog);
            console.log("New log inserted for chatid: " + group.name);
        }
    }
}

async function getLatestMessageTimeStamp(botid){
    let table = "home_botmessage";
    let sql = `SELECT * FROM ${table} WHERE botid = '${botid}' ORDER BY timestamp DESC LIMIT 1`;

    return new Promise((resolve, reject) => {
        db.get(sql, (err, row) => {
            if (err) {
                reject(err.message);
            } else {
                console.log(row.message);
                resolve(row ? row.timestamp : 0);
            }
        });
    });

}
async function insertNewMessages(id){
    let latestTime = await getLatestMessageTimeStamp(id);
    latestTime = Date.parse(latestTime)/1000;
    let client = clients[id];
    let groups = await fetchAllGroups(client);
    let newMessages = [];
    for (const group of groups) {
        let chatid = group.id;
        let messages = await getLatestMessagesAfterTimestamp(client, chatid, latestTime);
        for(let message of messages)
            newMessages.push(message);
    }
    let insertableMessages = [];
    for(let message of newMessages){
        let newMessage = {
            botid: id,
            chatid: message.from,
            message: message.body,
            isgroup: isGroup(message),
            seen_cnt: '0',
            read_cnt: '0',
            timestamp: unix2DateTime(message.timestamp * 1000)
        };
        insertableMessages.push(newMessage);
    }
    await saveNewMessageLog(insertableMessages);
    return insertableMessages;
}

// Increase the counter of the bot which is started
async function increasebotStartedCounter(id){
    db.serialize(() => {
        db.run(`UPDATE home_bot SET botStarted += 1 WHERE id = '${id}'`, function (err) {
            if (err) {
                return console.log(err.message);
            }
            // get the last insert id
            console.log(`A row has been inserted with rowid ${this.lastID}`);
        });
    });
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

async function getAllSemiActiveUsers(){
    let table = "home_bot";
    let sql = `SELECT * FROM ${table} WHERE type = 'semi-active'`;

    return new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(rows);
            }
        });
    });
}


async function getAllActiveUsers(){
    let table = "home_bot";
    let sql = `SELECT * FROM ${table} WHERE type = 'active'`;

    return new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(rows);
            }
        });
    });

}

// var users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
var users = [];
var clients = {};
var isInitialized = {};
var logScheduler = {};

async function updateUsers() {
    users = [];
    db.serialize(() => {
        db.each(`SELECT * FROM home_bot`, (err, user) => {
            if (err) {
                console.error(err.message);
            }
            users.push(user);
            // console.log(user);
            if (!isInitialized[user.id]) {
                isInitialized[user.id] = false;
                clients[user.id] = null;
            }
        });
    });
}

updateUsers();


async function startActiveUsers(){
    getAllActiveUsers().then((users)=>{
        for(let user of users){
            let id = user.id;
            let client =  new Client({
                authStrategy: new LocalAuth({ clientId: id }),
            });
            client.on('qr', qr => {
                console.log("User needs to scan QR code again.");
            });
            console.log(`User id: ${id}`);
            client.on('ready', async () => {
                console.log('Client is ready!');
                
                // Add mobile number to database if not exists
                let mobile = await getMobileFromDatabase(id);
                if (!mobile) {
                    mobile = await getMobileNumber(client);
                    await updateMobileInDatabase(id, mobile);
                }
                
                saveNewLog(await fetchAllGroups(client));
                if (!logScheduler[id]) {
                    logScheduler[id] = setInterval(saveNewLog, 1000 * 60 * 60 * 24);    // 24 hours
                }
            });
            client.on('message', async (message) => {
                console.log(await getMobileNumber(client));
                console.log(message.body);
                let newMessage = {
                    botid: id,
                    chatid: message.from,
                    message: message.body,
                    isgroup: isGroup(message),
                    seen_cnt: '0',
                    read_cnt: '0',
                    timestamp: new Date().toISOString()
                }
                saveNewMessage(newMessage);
            });
            client.on('message', message => {
                if(message.body === '!ping') {
                    message.reply('pong');
                }
            });
            client.on('disconnected', () => {
                console.log(`Client was logged out ${id}`);
                client.destroy();
                clients[id] = null;
                isInitialized[id] = false;
                clearInterval(logScheduler[id]);
                logScheduler[id] = null;
                console.log("Client logged out " + id);
                message = {
                    "status": "LOGGED OUT",
                    "id": id,
                }
            });
            client.initialize();

        
            isInitialized[id] = true;
            clients[id] = client;
            console.log("Client logged in " + id);
        }
    });
}

startActiveUsers();




// Create a server to interact with the client using REST APIs
const app = express();
const server = createServer(app);
const io = new Server(server,{
    cors:{
        origin: DJANGO_URL
    }
})

// Apply cors middleware first to handle CORS headers
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

app.get("/status", async (request, response) => {
    let status = {
       "application": "Running",
    };
    // update users
    await updateUsers();
    let bot = {};
    for (const [id, client] of Object.entries(clients)) {
        if (!isInitialized[id] || !client) {
            bot[id] = "NOT CONNECTED";
        } else {
            let clientStatus = await client.getState();    // TODO: remove this await
            bot[id] = clientStatus;
        }
    }
    status["status"] = bot;
    response.send(status);
});


app.get("/status/:id", async (request, response) => {
    let id = request.params.id;
});

// latest messages from the last 5 minutes

app.get("/syncmessage/:id", async (request, response) => {
    let id = request.params.id;
    
    let json_response = {
        "status": "OK",
        "messages": [],
    };
    if(id in logScheduler){
        if(logScheduler[id] != null){
            json_response["messages"] = await insertNewMessages(id);
            json_response["status"] = json_response["messages"][0].timestamp;
        }
    }
    response.send(json_response);
});


app.get("/groups/:id", async (request, response) => {
    let id = request.params.id;
    let client = clients[id];
    let json_response = {
        "status": "OK",
        "groups": [],
    };
    if (!client) {
        json_response["status"] = "NOT CONNECTED";
        response.send(json_response);
        return;
    }
    let groups = await fetchAllGroups(client);
    saveNewLog(groups);
    json_response["groups"] = groups;
    response.send(json_response);
});


// defining the io function to listen to the socket events

io.on("connection",(socket)=>{
    console.log(`User Connected ${socket.id}`)
// Lets create a send_message event that listens to the client whenever the 
// connected user calls the 'send_message' event allong with the data that
// contains the message data
    socket.on('send',(data)=>{
        // socket.broadcast.emit('recive_message',data)
        console.log(data);
        let operation = data.operation;
        if (operation == "login") {
            let id = data.id;
            let user = users.find(user => user.id === id);
            if (!user) {
                socket.emit('receive', "User id not found")
                return;
            }
            let client =  new Client({
                authStrategy: new LocalAuth({ clientId: id }),
            });
            client.on('qr', qr => {
