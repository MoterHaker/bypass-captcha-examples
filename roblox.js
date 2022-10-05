// Script demonstrates automatic sign in to your Roblox account
// Replace API key, login, password and proxy credentials with your own.
//
// Install packages:
// npm install @antiadmin/anticaptchaofficial puppeteer
//
// run with command: "node roblox.js"


const ac = require("@antiadmin/anticaptchaofficial");
const pup = require("puppeteer");


ac.setAPIKey('API_KEY_HERE');
ac.getBalance()
    .then(balance => console.log('my balance is: '+balance))
    .catch(error => console.log('an error with API key: '+error));


const login = 'YOUR_LOGIN';
const password = 'YOUR_PASSWORD';

const proxyAddress = "11.22.33.44"; //only numbers
const proxyPort = "1234"
const proxyUser = "mylogin";
const proxyPassword = 'mypassword';

//use unique browser agent
let userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36';
let browser = null;
let tab = null;

(async () => {
try {

    let xfrToken = null;
    let dataBlob = null;

    await prepareBrowser();

    console.log('setting response hook ..');
    //response interception to catch XHR token
    const xfrCatchPromise = new Promise((resolve, reject) => {
        tab.on('response', async (response) => {
            if (response.url() === "https://auth.roblox.com/v2/login" && xfrToken == null){
                console.log('XHR response received');
                let result = await response;
                let json = await result.json();

                if (json === null) {
                    reject('JSON is null');
                    return false;
                }

                console.log('intercepted response JSON:')
                console.log(json);
                const dataBlob = json.errors[0]["fieldData"];
                console.log('data blob: '+dataBlob);

                xfrToken = result._request._headers['x-csrf-token'];
                console.log('xfr token: '+xfrToken);
                resolve({xfrToken, dataBlob })
            }
        });
    });


    console.log('opening target page ..');
    //not using waitUntil:"networkidle0" option, sometimes causes page to never load
    await tab.goto('https://www.roblox.com/newlogin', {waitUntil: "domcontentloaded"});

    //let everything load
    console.log('waiting 5 seconds');
    await delay(5000);

    //use this to skip "accept all cookies" button
    await tab.click("#login-username");
    await delay(1000);

    console.log('filling login ..');
    await tab.click("#login-username");
    await tab.keyboard.type(login,{delay: 100});

    console.log('filling password ..');
    await tab.click("#login-password");
    await tab.keyboard.type(password,{delay: 100});

    await delay(5000);
    console.log('submitting form ..');

    [_, { xfrToken, dataBlob } ] = await Promise.all([
        tab.click("#login-button"),
        xfrCatchPromise,
    ]);

    const dataBlobObject = JSON.parse(dataBlob);

    if (typeof dataBlobObject.unifiedCaptchaId === "undefined" || xfrToken === null) {
        throw new Error("something went wrong");
    }

    const token = await solveArkoselabsCaptcha(dataBlobObject.dxBlob);
    console.log('Funcaptcha token from Anti-Captcha: '+token);

    const user = await makeAJAXRequestWithXFR(xfrToken, dataBlobObject.unifiedCaptchaId, token);
    if (user.user.name === login) console.log('completed successfully');
    else console.log('wrong user name');


} catch (e) {
    console.error('could not complete requests: '+e.toString())
}

browser.close();

})();



function delay(time) {
   return new Promise(function(resolve) {
       setTimeout(resolve, time)
   });
}

async function prepareBrowser() {
    try {
        console.log('opening browser ..');
        let options = {
            headless: true, //set to false if you want to see what's going on with the browser
            ignoreHTTPSErrors: true,
            devtools: false, //enable for debugging
            ignoreDefaultArgs: ["--disable-extensions","--enable-automation"],
            args: [
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--allow-running-insecure-content',
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--mute-audio',
                '--no-zygote',
                '--no-xshm',
                '--window-size=1920,1080',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--enable-webgl',
                '--ignore-certificate-errors',
                '--lang=en-US,en;q=0.9',
                '--password-store=basic',
                '--disable-gpu-sandbox',
                '--disable-software-rasterizer',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-infobars',
                '--disable-breakpad',
                '--disable-canvas-aa',
                '--disable-2d-canvas-clip-aa',
                '--disable-gl-drawing-for-tests',
                '--enable-low-end-device-mode'
            ]
        };
        if (proxyAddress && proxyPort) {
            options["args"].push(`--proxy-server=${proxyAddress}:${proxyPort}`);
        }
        browser = await pup.launch(options);

        console.log('creating new tab ..');
        tab = await browser.newPage();
    } catch (e) {
        console.log(e);
        return false;
    }


    if (proxyPassword && proxyUser) {
        console.log(`setting proxy authentication ${proxyPassword}:${proxyUser}`);
        await tab.authenticate({
            username: proxyUser,
            password: proxyPassword,
        });
    }

    await tab.setUserAgent(userAgent);
    await tab.setViewport({width: 1920, height: 1080});

    await tab.setRequestInterception(true);

    tab.on('request', request => {

       // preventing single-use dataBlob to be spent
       if (request.url().indexOf('public_key/476068BF-9607-4799-B53D-966BE98E2B81') !== -1) {
           console.log('Aborting URL request:' + request.url());
           request.abort();
       } else {
           request.continue();
       }
    });

    return true;

}

async function solveArkoselabsCaptcha(dataBlob) {

    ac.settings.funcaptchaApiJSSubdomain = 'roblox-api.arkoselabs.com';
    ac.settings.funcaptchaDataBlob = dataBlob;
    try {


        return await ac.solveFunCaptchaProxyOn(
            'https://www.roblox.com/login',
            '476068BF-9607-4799-B53D-966BE98E2B81',
            'http',
            proxyAddress,
            proxyPort,
            proxyUser,
            proxyPassword,
            userAgent);


    } catch (e) {
        throw new Error('Captcha not solved');
    }
}

async function makeAJAXRequestWithXFR(xfrToken, captchaId, token) {

    const evalParams = {
        captchaId,
        login,
        password,
        xfrToken,
        token
    };

    //access to console log
    tab.on('console', msg => console.log('PAGE LOG:', msg.text()));

    const userJSON =
        await tab.evaluate(async (evalParams) => {
            return new Promise((resolve, reject) => {

                console.log('making ajax call with login ' + evalParams.login + ', password ' + evalParams.password + ', XFR token "' + evalParams.xfrToken + '" and funcaptcha token "' + evalParams.token + '"');
                fetch('https://auth.roblox.com/v2/login', {
                    method: "POST",
                    body: JSON.stringify({
                        "captchaId": evalParams.captchaId,
                        "cvalue": evalParams.login,
                        "ctype": "Username",
                        "password": evalParams.password,
                        "captchaToken": evalParams.token
                    }),
                    headers: {
                        'Content-Type': 'application/json;charset=UTF-8',
                        'Accept': 'application/json, text/plain, */*',
                        'x-csrf-token': evalParams.xfrToken
                    }
                }).then(response => response.json())
                  .then(resultJSON => {


                    console.log('JSON result:')
                    console.log(resultJSON);

                    if (resultJSON.errors) {
                        if (resultJSON.errors[0]["code"] === 2) {
                            console.log('did not pass captcha');
                            reject('did not pass captcha');
                            return false;
                        }
                        if (resultJSON.errors[0]["code"] === 0) {
                            console.log('Token Validation Failed');
                            reject('Token Validation Failed');
                            return false;
                        }
                        console.log('unknown error: ' + resultJSON.errors[0]["message"]);
                        reject(resultJSON.errors[0]["message"]);
                        return false;
                    }
                    if (resultJSON.user) {
                        console.log('captcha accepted, user object is included in response');
                        resolve(resultJSON);
                        return true;
                    } else {
                        resolve('user object not found');
                        return false;
                    }

                }).catch(err => {
                    console.log('catched AJAX error: ' + err.toString());
                    reject('catched AJAX error: ' + err.toString())
                });


            });


        }, evalParams);

    console.log('completed successfully');
    console.log(userJSON);
    return userJSON;


}

