const sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('./waas/db.sqlite3', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the my database.');
});


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


async function update() {
    try {
        let id = "d038e31e-7b11-4cb7-871c-f795749f5aec";
        let newMobile = "";
        let result = await updateMobileInDatabase(id, newMobile);
        console.log(result);
    } catch (error) {
        console.error(error);
    }
}







async function print() {
    let mobile = await getMobileFromDatabase("76391181-de1c-4323-b69a-1135861b98b8");
    console.log(mobile);
}

// update()



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

async function getLatestLog(chatid) {
    try {
        let log = await getLatestLogFromDatabase(chatid);
        console.log(log);
    } catch (error) {
        console.error(error);
    }
}


// getLatestLog("112324@c.us");


function insertNewLog(data) {
    let table = "home_grouplog";
    let sql = `INSERT INTO ${table} (chatid, name, participants_size, participants, timestamp) VALUES ('${data.chatid}', '${data.name}', '${data.participants_size}', '${data.participants}', '${data.timestamp}')`;

    return new Promise((resolve, reject) => {
        db.run(sql, function(err) {
            if (err) {
                reject(err.message);
            } else {
                resolve(`New log inserted for chatid: ${data.chatid}`);
            }
        });
    });
}


async function insert() {
    let data = {
        "chatid": "123123123",
        "name": "Test",
        "participants_size": 10,
        "participants": "123,123,123,123,123,123,123,123,123,123,123",
        "timestamp": new Date().toISOString()
    }
    try {
        let result = await insertNewLog(data);
        console.log(result);
    } catch (error) {
        console.error(error);
    }
}

insert();


function isSameDate(d1_iso_string, d2_iso_string) {
    let d1 = new Date(d1_iso_string);
    let d2 = new Date(d2_iso_string);
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}


console.log(isSameDate("2024-01-09T01:05:30.012Z", new Date().toISOString()));