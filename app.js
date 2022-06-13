'use strict'
var express = require('express');
let http    = require("http");
let fs      = require("fs");
var path    = require('path');
var exec    = require('child_process').exec;

var app = express();

app.use(express.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, 'public')));
app.post('/api/:type', api);
app.get('/api/:type', api);

if(!module.parent){
  http.createServer(app).listen(3000);
  console.log('Express started on port 3000, supervisor!');
}

async function api(req, res){
  switch(req.params.type){
    case 'project':
      let data     = fs.readdirSync("../");
      let projects = []
      data.map(file => {
        let stats = fs.statSync('../' + file)
        if(stats.isDirectory() && fs.existsSync('../' + file + '/dfx.json')){
          projects.push(file)
        }
      })
      res.send(projects)
      break
    case 'dfx':
      let command = req.body.command
      let project = req.body.project
      if(project){
        command = 'cd ../' + project + ';' + command
      }
      console.log(command)
      exec(command, function(err, stdout, stderr){
        console.log({err, stdout, stderr})
        if(err){
          res.send(stderr)
        }
        else{
          let output = stderr
          if(/\[missing\]/.test(stderr)){
            output = output.replace(' [missing]', '* ' + stdout)
          }
          else if(/\*/.test(stderr)){
            output = output.replace(' *', stdout+ ' *')
          }
          else if(stdout){
            output = stdout
          }
          res.send(output)
        }
      })

      return;
      break
    default:
      res.send('req.params.type undefined', req.params.type)
  }
}

function wait(ms){
  return new Promise(resolve => setTimeout(() => resolve(), ms))
}

function runExec(cmd, cb){
  exec(cmd, function(err, stdout, srderr){
    cb(err, stdout, srderr)
  });
}

function runSpawn(cmd, cb){
  let proc = spawn(cmd, [], {stdio: 'pipe'});

  let text = ''
  let err  = ''
  proc.stdout.on('data', (data) => {
    let dataStr = String(data);
    console.log(108, dataStr)
    text += dataStr;
  });

  proc.stderr.on('data', (data) => {
    // 不一定代表进程exitcode != 0，可能只是进程调用了console.error
    let dataStr = String(data);
    console.log(115, dataStr)
    err += dataStr
  });

  // 进程错误
  proc.on('error', (error) => {
    cb(1, 0, err + ' ' + error);
  });

  proc.on('close', (code) => {
    console.log(123, code)
    if(code == 2){
      cb(0, text || err, '');
    }
    else{
      let errMsg = `process closed with exit code: ${code}`;
      cb(2, 0, errMsg);
    }
  });
}

module.exports = app;
