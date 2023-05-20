// const puppeteer = require('puppeteer'),
const puppeteer = require('puppeteer-extra'),
        StealthPlugin = require("puppeteer-extra-plugin-stealth"),
        cheerio = require('cheerio'),
        UserAgent = require("user-agents"),
        ac = require("@antiadmin/anticaptchaofficial"),
        
        PROXY_USERNAME = process.env.PROXY_USERNAME,
        PROXY_PASSWORD = process.env.PROXY_PASSWORD,
        PROXY_SERVER = process.env.PROXY_SERVER,
        PROXY_SERVER_PORT = process.env.PROXY_SERVER_PORT,
        PROXY_ACTIVE = JSON.parse(process.env.PROXY_ACTIVE),


        urlConsulta = process.env.CURP_URL_CONSULTA,
        urlDescarga = process.env.CURP_URL_DESCARGA,

        antiCaptchaKey = process.env.ANTICAPTCHA_KEY,
        gKEY = process.env.G_KEY,
        urlTarget = process.env.CURP_URL;

const myConst = {
    AN: "Alta nominal",
    AH: "Alta con homonimia",
    CRA: "Curp reactivada",
    RCN: "Registro de cambio no afectando a curp",
    RCC: "Registro de cambio afectando acurp",
    BD: "Baja por defuncion",
    BDA: "Baja por duplicidad",
    BCC: "Baja por cambio en curp",
    BCN: "Baja no afectando a curp"
    };
          
let finalResponse = null;
let downloadResponse = null;



module.exports = {
    ObtenerCurp: async function(curp, response)
    {
        return await ScrappCurpbyCurp(curp, response);
    },
    ObtenerCurpByData: async function(clave_entidad, dia_nacimiento, mes_nacimiento, nombres, primer_apellido, segundo_apellido, anio_nacimiento, sexo, response){
        return await ScrappCurpbyData(clave_entidad, dia_nacimiento, mes_nacimiento, nombres, primer_apellido, segundo_apellido, anio_nacimiento, sexo, response);
    }
}

async function ScrappCurpbyCurp(curp, response){

    let responseFinal = response;
    let errorInfo = "";
    let file = "";
    let errData = "ini";

    try{
        for(let i = 0; i < 3; i++){

            puppeteer.use(StealthPlugin());

            errData += "\nUse StealthPlugin";

            let browser = await StartBrowser();

            errData += "\nUse startBrowser";

            const userAgent = new UserAgent({deviceCategory: "desktop"});
            
            errData += "\nUse useragent";
            try{

                let page = await browser.newPage();

                errData += "\nUse newPage";

                await page.setUserAgent(userAgent.random().toString());

                errData += "\nUse setUserAgent";

                if(PROXY_ACTIVE){
                    await page.authenticate({
                        username: PROXY_USERNAME,
                        password: PROXY_PASSWORD,
                    });
                }
            
                await page.goto(urlTarget, {timeout: 60000});
                let bodyHTML = await page.evaluate(() => document.body.innerHTML);
                let $ = cheerio.load(bodyHTML);

                errData += "\nUse gotoPage";

                

                await page.waitForSelector('#ember313 > div > div > iframe', 3000);
                const elementHandle = await page.$('.g-recaptcha > div > div > iframe')
                const frame = await elementHandle.contentFrame()                

                await wait(2 * 1000);

                let responseData = "";

                ac.setAPIKey(antiCaptchaKey);

                await ac.solveRecaptchaV2Proxyless(urlTarget, gKEY)
                    .then(gresponse => {
                    console.log('g-response: '+gresponse);
                    responseData = gresponse;
                })
                .catch(error => console.log('test received error '+error));

                if(responseData === "") continue;

                
                await page.evaluate(val => document.querySelector('#curpinput').value = val, curp);            
                await page.evaluate(val => document.querySelector('#g-recaptcha-response').value = val, responseData);

                await page.setRequestInterception(true);                
                page.on('request', handleRequest);
                page.on('response', handleResponse);

                const btnSearch = await page.$('#searchButton');
                await btnSearch.evaluate( btnSearch => btnSearch.click() );

                await wait(1 * 1000);
                

                // finalResponse = await page.waitForResponse(response =>
                //     response.url() === urlConsulta && response.status() === 200
                // );

                jsonResponse = await finalResponse.json();

                jsonResponseFinal = formatJsonResponse(jsonResponse, responseData);
                

                if(typeof jsonResponse == "object" &&  jsonResponse.codigo === "01" )
                {
                    jsonResponseFinal["files"] = [];
                    jsonResponseFinal.files[0] = await GetFile(page);

                    responseFinal.data = jsonResponseFinal;
                    responseFinal.status = "success";
                    responseFinal.code = 200;
                    responseFinal.message = "resolve!";

                    return responseFinal;
                }
                else{
                    responseFinal.data =  jsonResponseFinal;
                    responseFinal.message =  "error durante procesamiento";
                    responseFinal.code =  120;
                    responseFinal.status = "error";

                    return responseFinal;
                }
            }
            catch(err){
                console.log(err);

                responseFinal.data =  null;
                responseFinal.message =  "error durante procesamiento";
                responseFinal.code =  140;
                responseFinal.status = "error";
            }
            finally{
                await browser.close();    
            }
        }
    }
    catch(err){

        responseFinal.data = {error : JSON.stringify(errData) };
        responseFinal.message =  "error durante procesamiento";
        responseFinal.code =  141;
        responseFinal.status = "error";        
    }

    return responseFinal;
    
}

async function ScrappCurpbyData(clave_entidad, dia_nacimiento, mes_nacimiento, nombres, primer_apellido, segundo_apellido, anio_nacimiento, sexo, response){

    try{

        let responseFinal = response;
        let errorInfo = "";
        let file = "";


        for(let i = 0; i < 3; i++){

            puppeteer.use(StealthPlugin());

            let browser = await StartBrowser();

            const userAgent = new UserAgent({deviceCategory: "desktop"});
            
            await page.setUserAgent(userAgent.random().toString());

            try{


                let page = await browser.newPage();

                if(PROXY_ACTIVE){
                    await page.authenticate({
                        username: PROXY_USERNAME,
                        password: PROXY_PASSWORD,
                    });
                }
            
                await page.goto(urlTarget, {timeout: 180000});
                let bodyHTML = await page.evaluate(() => document.body.innerHTML);
                let $ = cheerio.load(bodyHTML);

                await page.waitForSelector('#ember313 > div > div > iframe', 3000);
                const elementHandle = await page.$('.g-recaptcha > div > div > iframe')
                const frame = await elementHandle.contentFrame()                

                await wait(2 * 1000);

                let responseData = "";

                ac.setAPIKey(antiCaptchaKey);

                await ac.solveRecaptchaV2Proxyless(urlTarget, gKEY)
                    .then(gresponse => {
                    console.log('g-response: '+gresponse);
                    responseData = gresponse;
                })
                .catch(error => console.log('test received error '+error));

                if(responseData === "") continue;

                await page.evaluate(val => document.querySelector('#g-recaptcha-response').value = val, responseData);

                
                await page.click('#datos a');

                
                await page.evaluate(val => document.querySelector('#nombre').value = val, nombres);            
                await page.evaluate(val => document.querySelector('#primerApellido').value = val, primer_apellido);
                await page.evaluate(val => document.querySelector('#segundoApellido').value = val, segundo_apellido);

                await page.select('#diaNacimiento', dia_nacimiento);
                await page.select('#mesNacimiento', mes_nacimiento);

                await page.evaluate(val => document.querySelector('#selectedYear').value = val, anio_nacimiento);

                await page.select('#sexo', sexo);
                await page.select('#claveEntidad', clave_entidad);

                await page.setRequestInterception(true);
                
                page.on('request', handleRequest);
                page.on('response', handleRequest);

                const btnSearch = await page.$('#searchButton');
                await btnSearch.evaluate( btnSearch => btnSearch.click() );

                await wait(1 * 1000);

                // finalResponse = await page.waitForResponse(response =>
                //     response.url() === urlConsulta && response.status() === 200
                // );

                jsonResponse = await finalResponse.json();

                jsonResponseFinal = formatJsonResponse(jsonResponse, responseData);

                if(typeof jsonResponse == "object" &&  jsonResponse.codigo === "01" )
                {
                    jsonResponseFinal["files"] = [];

                    let fileData = await GetFile(page);
                    if(fileData === "") throw exception("PDF no pudo ser obtenido");

                    
                    jsonResponseFinal.files[0] = fileData;

                    responseFinal.data = jsonResponseFinal;
                    responseFinal.status = "success";
                    responseFinal.code = 200;
                    responseFinal.message = "resolve!";

                    return responseFinal;
                }
                else{
                    responseFinal.data =  jsonResponseFinal;
                    responseFinal.message =  "error durante procesamiento";
                    responseFinal.code =  120;
                    responseFinal.status = "error";

                    return responseFinal;
                }         
            }
            catch(err){
                console.log(err);

                responseFinal.data =  null;
                responseFinal.message =  "error durante procesamiento";
                responseFinal.code =  140;
                responseFinal.status = "error";
            }
            finally{
                await browser.close();    
            }
        }
    }
    catch(err){

        responseFinal.data =  {error : JSON.stringify(err) };
        responseFinal.message =  "error durante procesamiento";
        responseFinal.code =  141;
        responseFinal.status = "error";        
    }

    return responseFinal;
}

async function wait (ms) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms)
    });
}

function formatData(tableData){
    //convert table data to json
    let data = [];

    for(let i = 0; i < tableData.length; i++){
        let row = {};
        row[tableData[i][0]] = tableData[i][1];
        data.push(row);
    }
}

function formatJsonResponse(json, gdata){

    let data = {};
    data["gdata"] = gdata;  
    data["curpdata"] = {};
    

    if(json === "")  data.curpdata["mensaje"] = "respuesta CURP no obtenida";
    if(!json.hasOwnProperty("codigo")) data.curpdata = GetJsonError();
    else if(json.codigo === "01" ) data.curpdata = GetJsonSuccess(json);
    else if(json.codigo === "07" ) data.curpdata = GetJsonCatpchaInvalido(json);
    else  data.curpdata = GetJsonErrorRespuestaCurp(json);    

    return data;
}

function getValueStatus(valueStatusCurp){
    return myConst[valueStatusCurp] || '';

}

function GetJsonError(){    
    let json = {};    
    
    json["codigo"] = 120;
    json["mensaje"] = "Error durante consulta";    
    
    return json;
}

function GetJsonErrorRespuestaCurp(json){
    try{        
        json["codigo"] = json.codigo;
        json["mensaje"] = json.mensaje;
    }
    catch(err){
        json["codigo"] = 120;
        json["mensaje"] = "Error durante consulta";
    }
    
    return json;
}

function GetJsonSuccess(json){ 

    let data = [];
    data = json.registros;    

    data.forEach(element => {
        element["descriptionStatusCurp"] = getValueStatus(element.statusCurp);
    });
    return data;
}

function GetJsonCatpchaInvalido(json){ 

    let jsonData = {};
    jsonData["codigo"] = json.codigo;
    jsonData["mensaje"] = json.mensaje;        

    return jsonData;
}

async function  StartBrowser(){
    return (PROXY_ACTIVE)? await StartBrowserProxy() : await StartBrowserNoProxy();
}

async function  StartBrowserNoProxy(){
    return await puppeteer.launch({
        headless: 'new',
        ignoreHTTPSErrors: true,
        args: [
            //`--proxy-server=http://${PROXY_SERVER}:${PROXY_SERVER_PORT}`, '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process', '--no-sandbox'
        ]
    });
}

async function StartBrowserProxy(){
    return await puppeteer.launch({
        headless: 'new',
        ignoreHTTPSErrors: true,
        args: [
            `--proxy-server=http://${PROXY_SERVER}:${PROXY_SERVER_PORT}`, '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process,', '--no-sandbox'
        ]
    });
}

async function handleRequest(request) {
    try {
        // console.log(request);
      await request.continue(); 
    } catch (err) {
      console.log(err);
    }
}

async function handleResponse(response) {
    try {
        console.log(response.url());
        if(response.url() === urlConsulta && response.status() === 200)
            finalResponse = response;

        if(response.url().includes(urlDescarga)  && response.status() === 200)
            downloadResponse = response;
        
    } catch (err) {
      console.log(err);
    }
}

async function GetFile(page){

    try{
        let pdfCurp = "";

        pdfCurp =(downloadResponse !== null) ? await GetFileFromResponse(downloadResponse) : await DownLoadFile(page);

        return pdfCurp;
    }   
    catch(err)
    {
        console.log(err);
        return "";
    }
}

async function DownLoadFile(page){

    let pdfCurp = "";

    await wait(2 * 1000);
        
    const btnDownload = await page.$('#download');
    await btnDownload.evaluate( btnDownload => btnDownload.click() );

    await wait(2 * 1000);

    if(downloadResponse !== null) {
        pdfCurp = await GetFileFromResponse(downloadResponse);
    }
    else{
        throw exception("PDF no pudo ser obtenido");
    }

    return pdfCurp;
} 

async function GetFileFromResponse(resp){

    let pdfCurp = "";
    pdfCurp = await resp.text();
    // pdfCurp = pdfCurp.replace(/\\n/g, "");
    pdfCurp = pdfCurp.replace(/[\n\r]/g,'');


    return pdfCurp;
}
