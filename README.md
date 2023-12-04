# WAAS (WhatsApp bot as a Service)
WhatsApp Bot with multiple client support and web interface

## Installation
```bash
pip install -r requirements.txt
cd bots
npm install
```

## Creation of database
```bash
python waas/manage.py migrate
python waas/manage.py makemigrations
```

## Usage
In root directory, run below commands in separate terminals
```bash
node bots/bot.js
python waas/manage.py runserver
``````
