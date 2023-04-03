const { spawn } = require('child_process');
const express = require('express');
const path = require('path');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const gpt4all_home = process.env.GPT4ALL_HOME

if (!gpt4all_home) {
  console.error('Error: GPT4ALL_HOME environment variable is not set.');
  process.exit(1);
}
//'/Users/i303937/SAPDevelop/gpt4all/gpt4all';
var buffer = '';
var gptResponse = '';

async function waitForBuffer() {
  while (gptResponse === '') {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return gptResponse;
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});




io.on('connection', (socket) => {
    
    const child = spawn('./gpt4all-lora-quantized-OSX-m1', [], { cwd: gpt4all_home + path.sep + 'chat' });
    console.log(`A user connected - create process ${child.pid}`);

    child.stdout.on('data', (data) => {
      if (data.toString().includes('>')) {
        gptResponse = buffer.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
        //[1m[32m[0m
        console.log(`stdout ${child.pid}: ${gptResponse}`);
        buffer = '';
      }
      else
      {
        buffer += data.toString();
      }
    });
    
    child.stderr.once('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    
    child.on('close', (code) => {
      console.log(`child process exited`);
    });    

    socket.on('chat message', async (msg) => {
        console.log('message: ' + msg);
        socket.emit('chat message', msg);

        child.stdin.write(msg + '\n');
        const result = await waitForBuffer();
        socket.emit('chat message', result);
        gptResponse = '';

      });

    socket.on('disconnect', () => {
      setTimeout(() => {
        child.kill('SIGTERM');
      }, 10000);

      console.log(`A user disconnected - kill process ${child.pid}`);
    });

  });

server.listen(3000, () => {
  console.log('listening on *:3000');
});