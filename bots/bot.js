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
