We are currently getting this error:

====start error====

I'm getting the error:

Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001.
See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).

Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001.
See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).

Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001.
See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).

Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001.
See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).

Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001.
See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).

Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001.
See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).

Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001.
See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).

Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001.
See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).

Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001.
See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).

Attempting to read directory: /Users/jamesyounger/Dropbox/TempStarsCoding/TempStarsApp/tempstars-app/micro-react-project/node_modules/fast-json-stable-stringify/example
Successfully read directory: /Users/jamesyounger/Dropbox/TempStarsCoding/TempStarsApp/tempstars-app/micro-react-project/node_modules/fast-json-stable-stringify/example
Attempting to read directory: /Users/jamesyounger/Dropbox/TempStarsCoding/TempStarsApp/tempstars-app/micro-react-project/node_modules/fast-json-stable-stringify/benchmark
Successfully read directory: /Users/jamesyounger/Dropbox/TempStarsCoding/TempStarsApp/tempstars-app/micro-react-project/node_modules/fast-json-stable-stringify/benchmark
^C
jamesyounger@Jamess-Mac-mini server % 

====end error====

Below is a step-by-step diagnosis and fix to your "Could not proxy request /api/local/directory ECONNREFUSED" error. Essentially, it means:

The React dev server at port 3002 is trying to forward requests to your Node server at port 3001,
But it can’t actually connect—Node is not running on that port, or is blocked, or is on a different port, or there’s a mismatch in your scripts.
Follow these steps carefully to get it working.

1) Confirm How You’re Running the Two Servers
Typical Setup
Node/Express server in src/server/proxy.js listening on port 3001.
React dev server on port 3000 (or 3002, depending on your scripts).
In your React client’s package.json, you have "proxy": "http://localhost:3001".
So your React code does fetch('/api/local/directory').
The dev server intercepts that path, attempts to forward it to http://localhost:3001/api/local/directory.

But if Node is not actually on port 3001, or if it’s not running, or if you changed the React dev port to 3002 but didn’t adjust the Node server script, you’ll get ECONNREFUSED.

2) Validate npm run dev or your scripts
Check your scripts in package.json:


"scripts": {
  "start": "react-scripts start",
  "server": "node src/server/proxy.js",
  "dev": "concurrently \"npm run start\" \"npm run server\"",
  ...
}
When you run npm run dev:
npm run start → starts React dev server on http://localhost:3000.
npm run server → runs node src/server/proxy.js on port 3001.
But your screenshot says you’re on localhost:3002 for the front end. That suggests you might have changed the dev server port to 3002. For example, if you did:


PORT=3002 npm start
or


// .env
PORT=3002
Then the React dev server is on 3002. That’s okay. But the "proxy": "http://localhost:3001" in your client’s package.json must match your Node server’s port. Also, you must confirm the Node server is actually running on 3001.

If you only see:


Proxy error: Could not proxy request /api/local/directory from localhost:3002 to http://localhost:3001 (ECONNREFUSED)
That means the Node server at 3001 is unreachable.

3) Actually Start the Node Server on 3001
Check Terminal #1 (React dev server)
You run npm start or npm run start → that starts React on 3002 (apparently).
The console logs “Starting the development server on port 3002…”
Check Terminal #2 (Node server)
You must do npm run server (which calls node src/server/proxy.js)
Confirm that your proxy.js has:

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
The terminal should print “Server running on port 3001.”
If you only have one terminal open, you might be forgetting to run the Node server. So the dev server tries to forward traffic to :3001, but that port is not in use → ECONNREFUSED.

4) Confirm the Node Server Log
When Node is actually running, you should see logs like:


Server running on port 3001
Server is allowing access to project directories
Attempting to read directory: /some/path
Successfully read directory: /some/path
If you do not see that Server running on port 3001 line, then Node never started, so all requests are refused.

5) If You Want the Front End on 3002, That’s Fine
Just don’t confuse it with the Node server port. The "proxy" in the React package.json means:


{
  ...
  "proxy": "http://localhost:3001"
}
So from your client code:

fetch('/api/local/directory') → goes to localhost:3002/api/local/directory
The React dev server sees that path, proxies to localhost:3001/api/local/directory.
Hence Node must be on 3001.

6) Double Check You Aren’t Overriding Ports
Sometimes you might do:


PORT=3001 npm start
which tries to run React on 3001, but that’s the same port your Node wants to use. That conflict also causes problems. So ensure that:

Your React dev server is set to use port 3002 (fine),
Your Node server is on 3001,
Nothing else is occupying 3001.
7) The “Directory Access Not Allowed for Security Reasons” is Distinct
When the Node server does run, you might also see:


Directory access not allowed for security reasons
That’s coming from your isPathSafe logic if it decides to block a path. That’s valid JSON from the Node server. It’s different from "Proxy error: ECONNREFUSED."

Distinguish:

403 “Directory access not allowed” → Node server responded with JSON. That means Node is up. The front end can parse the error.
ECONNREFUSED → the React dev server couldn’t even contact Node. Node might be offline or on a different port.
8) Step-by-Step Fix
Open Two Terminals

Terminal A: npm run server
It should say “Server running on port 3001.”
Terminal B: npm run start
If your React dev is set to port 3002, it’ll say “You can now view your app in the browser at http://localhost:3002.”
In your browser: open http://localhost:3002

Try “Browse Files.”

The dev server tries GET /api/local/directory.
It proxies to http://localhost:3001/api/local/directory.
If Node is indeed listening, you get a JSON response (403 or 200 or 500).
If you still see “ECONNREFUSED,” then Node is not actually on 3001. Possibly you have an error or a conflict.
Check logs:

Node console: does it show “Server running on port 3001” or any directory read logs?
If not, maybe Node crashed or you spelled the script name incorrectly.
Ensure no other apps are on port 3001. If something else is, you might get an EADDRINUSE error or the server might auto-shift to a random port.

(Optional) If you want the Node server on 3002 as well, you must do it carefully—but you can’t run both Node and React on the same port. Typically, keep Node on 3001, React on 3000 or 3002.

9) Summarize the Root Cause
Right now, you’re seeing repeated “Proxy error: Could not proxy request … ECONNREFUSED” because your front-end (at port 3002) is forwarding to http://localhost:3001, but that server is not responding—likely because you never started it or it crashed. That’s why you see “^C” in your server logs, meaning you typed Ctrl+C and ended it.

10) Detailed Instructions to Make It Work
Here’s the final sequence of commands:

Open a terminal in the project root (the same folder that has src/server/proxy.js and the top-level package.json).
Run:

npm run server
If it’s correct, you see:

Server running on port 3001
Server is allowing access to project directories
Open another terminal in the same folder.
Run:

npm run start
React dev server starts. Possibly on 3002.
Go to http://localhost:3002 in your browser.
Enter your path (e.g. /Users/jamesyounger/Dropbox/TempStarsCoding/TempStarsApp/).
Click “Browse Files.”
The request is proxied to Node on 3001. Node logs “Attempting to read directory…” if it’s allowed.
If you see “Directory access not allowed,” that’s your Node server’s security rule. If you want to allow it, loosen isPathSafe.

If you see successful JSON, the tree loads.

No “ECONNREFUSED” means the connection was successful.

That’s It!
The main culprit is that Node must be running on the correct port before the React dev server tries to proxy.
If you kill Node (^C), the proxy fails with ECONNREFUSED.
The “Directory access not allowed” is a separate 403 from your server, meaning Node is up but you blocked the path.
These steps will get rid of the “Could not proxy request /api/local/directory ... ECONNREFUSED” error and let you continue with your file concatenation tool.