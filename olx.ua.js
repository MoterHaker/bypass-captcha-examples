//npm install puppeteer fs @antiadmin/anticaptchaofficial
// update your login credentials
// run with command: "node olx.ua.js"


const anticaptcha = require("@antiadmin/anticaptchaofficial");
const pup = require("puppeteer");


//API key for anti-captcha.com
const anticaptchaAPIKey = 'API_KEY_HERE';

//access data
const url = 'https://www.olx.ua/account/#register';
const sitekey = '6Le48QAaAAAAAId_ao_tJuFtMhPEoRr8h3BmlS7H';
const login = makeid(15)+'@gmail.com';
const password = makepass(12)+Math.round(Math.random()*100);

//uncomment and fill if you want to use proxy
// const proxyAddress = 'xxx.yyy.zzz.ddd';
// const proxyPort = 1234;
// const proxyUser = 'user';
// const proxyPassword = 'login';

const proxyAddress = null;
const proxyPort = null;
const proxyUser = null;
const proxyPassword = null;

let browser = null;
let page = null;
let token = null;


(async () => {

    anticaptcha.setAPIKey(anticaptchaAPIKey);
    const balance = await anticaptcha.getBalance();
    if (balance <= 0) {
        console.log('Buy your anticaptcha balance!');
        return;
    } else {
        console.log('API key balance is '+balance+', continuing');
        anticaptcha.shutUp(); //uncomment for silent captcha recognition
    }

    console.log('registering account with login '+login+' and password '+password);

    try {
        console.log('opening browser ..');


        let options = {
            headless: false,
            ignoreHTTPSErrors: true,
            devtools: true
        };
        if (proxyAddress && proxyPort) {
            options["args"] = ['--proxy-server='+proxyAddress+':'+proxyPort];
        }
        console.log(options);
        browser = await pup.launch(options);


        console.log('creating new page ..');
        page = await browser.newPage();
    } catch (e) {
        failCallback("could not open browser: "+e);
        return false;
    }

    //screen size
    await page.setViewport({width: 1360, height: 1000});

    //setting proxy login and password
    if (proxyPassword && proxyUser) {
        console.log('setting proxy authentication .. ('+proxyUser+":"+proxyPassword+')');
        await page.authenticate({
            username: proxyUser,
            password: proxyPassword,
        });
    }

    try {
        await page.goto(url, {
            waitUntil: "networkidle0"
        });
    } catch (e) {
        console.log('err while loading the page: '+e);
    }

    console.log('solving captcha');

    try {
        token = await anticaptcha.solveRecaptchaV3Enterprise(
            url,
            sitekey,
            0.9,
            'register');
    } catch (e) {
        failCallback("could not solve captcha");
        return;
    }

    console.log('token is ready: '+token);


    console.log('filling form ..');

    const loginInput= await page.$(`#userEmailPhoneRegister`)
    await loginInput.focus();
    await page.type(`#userEmailPhoneRegister`,login)

    await delay(1000);

    const passwordInput= await page.$(`#userPassRegister`)
    await passwordInput.focus();
    await page.type(`#userPassRegister`,password)


    await delay(1000);

    await page.$eval('input[name="register[rules]"]', check => check.checked = true);

    const injectHTML = '<textarea name="g-recaptcha-response">'+token+'</textarea>';
    await page.$eval('#registerForm > div:nth-child(10)', (element, injectHTML) => {
        element.innerHTML = injectHTML;
    }, injectHTML);

    await delay(3000);

    try {
        await page.evaluate(async () => {

            onSubmit();

        });
    } catch (e) {
        failCallback("could not submit form: "+e);
    }

    await delay(10000);

    const failKeyword = 'Произошла ошибка во время регистрации аккаунта';

    let htmlContent = await page.$eval('*', el => el.innerText);

    if (htmlContent.indexOf(failKeyword) !== -1) {
        failCallback('Failed to register');
    } else {
        successCallback('registered account with login '+login+' and password '+password);
    }

    console.log('done');



})();



function delay(time) {
   return new Promise(function(resolve) {
       setTimeout(resolve, time)
   });
}



function successCallback(result) {
    console.log('Successfully passed: '+result);
    // console.log('closing browser .. ');
    // browser.close();
}

function failCallback(code) {
    console.log('Failed to pass: '+code);
    // console.log('closing browser .. ');
    // browser.close();
}

function makeid(length) {
   let result           = '';
   let characters       = 'abcdefghijklmnopqrstuvwxyz';
   let charactersLength = characters.length;
   for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

function makepass(length) {
   let result           = '';
   let characters       = 'abcdefghijklmnopqrstuvwxyzQWERTYUIOPASDFGHJKLZXCVBNM12345678901234567890';
   let charactersLength = characters.length;
   for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}