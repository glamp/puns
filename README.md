# Puns!

Puns, puns, puns, puns, puns


![](./public/img/platypus-quote.png)


### go
```bash
$ export TWILIO_PHONE="+15555555555"
$ export TWILIO_SID="abcd1234"
$ export TWILIO_TOKEN="efgh5678"
$ node app.js
```

### get yourself a pun
```$
$ http POST localhost:5000/pun phone:=7138259910
# using CURL
# using https://github.com/jakubroztocil/httpie
$ curl -X POST -H "Content-type: application/json" --data '{ "phone": "7138259910" }' localhost:5000/pun
```

