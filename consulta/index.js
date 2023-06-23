const {v1: uuidv1 } = require('uuid'),
moment   = require("moment"),
DB       = require("../Shared/Utils/DB"),
scrapper = require("../Shared/Service/scrapper");

const estados = ["AS", "BC", "BS", "CC", "CL", "CM", "CS", "CH", "DF", "DG", "GT", "GR", "HG", "JC", "MC", "MN", "MS", "MT", "NL", "OC", "PL", "QT", "QR", "SP", "SL", "SR", "TC", "TS", "TL", "VZ", "YN", "ZS", "NE"];

const generos = ["M", "H", "X"];

module.exports = async function (context, req) {

    let body = null;
    const strBody = JSON.stringify(req.body);
    const reqJson = req.body;
    const uuid = uuidv1();
    const request_time = moment().utc();
    let idLog = "";
    let response = { status: "error", message: "", data: null, code: 0 };

    try{

        idLog = await SaveRequest(strBody, uuid, request_time);

        response = await errorRequest(reqJson, response);

        if(response.code !== 0) body = response;

        if(response.code === 0 && reqJson.tipo_busqueda == "curp") body = await scrapper.ObtenerCurp(reqJson.curp, response, uuid);

        if(response.code === 0 && reqJson.tipo_busqueda == "datos") body = await scrapper.ObtenerCurpByData(reqJson.clave_entidad, reqJson.dia_nacimiento, reqJson.mes_nacimiento,
            reqJson.nombres, reqJson.primer_apellido, reqJson.segundo_apellido, reqJson.anio_nacimiento, reqJson.sexo, response, uuid);

    }
    catch(err){
        response.code = 500;
        response.message = "Error al procesar la petición";
        response.data = null;
        response.status = "error";

        body = response;
    }
    finally{
        if(idLog !== "") await SaveResponse(idLog, response, response.status, request_time)
    }    
    
    let status = 200;

    if(response.code == 120) status = 406;

    context.res = {
         status: status, /* Defaults to 200 */        
        headers: {
            "content-type": "application/json"
        },
        body: body
    };
}


function SaveRequest(body, guid, reqTime){

    return DB.insert({
        request: body, 
        guid: guid, 
        request_datetime: reqTime.format("YYYY-MM-DD HH:mm:ss")
    }, DB.tabla.consultarCurplog)    
    .then(id => { return ( id);})
    .catch(err => { return console.log(err, req.guid)});
}

function SaveResponse(idLog, response, status, reqTime){

    let response_time = moment().utc();
    let duration = moment.duration(response_time.diff(reqTime)).asSeconds();

    return DB.update({
        response: JSON.stringify(response),
        response_datetime: response_time.format("YYYY-MM-DD HH:mm:ss"),                        
        status: status,
        tiempo: duration
    }, DB.tabla.consultarCurplog, `id=${idLog}`)
}

async function errorRequest(req, response){

    var responseErrorGeneral = {
        status: "error",
        message: "Estimado/a usuario/a: Los datos ingresados no son correctos. Verifica e int\éntalo de nuevo. En caso de que persista la misma respuesta, favor de enviar un correo electr\ónico a tramitecurp@segob.gob.mx, describiendo claramente la situaci\ón a atender y anexando copia de tu acta de nacimiento y de una identificaci\ón oficial. Gracias.",
        data: {
            gdata: "",
            curpdata: {
                codigo: "180001",
                mensaje: "Estimado/a usuario/a: Los datos ingresados no son correctos. Verifica e int\éntalo de nuevo. En caso de que persista la misma respuesta, favor de enviar un correo electr\ónico a tramitecurp@segob.gob.mx, describiendo claramente la situaci\ón a atender y anexando copia de tu acta de nacimiento y de una identificaci\ón oficial. Gracias."
            }
        },
        code: 120
    };

    if(!req) response.message = "Error en request";
    else if(!req.tipo_busqueda)  {
        response.message = "El campo Tipo es requerido.";
        response.data = {};
        response.data.curpdata = {};
        response.data.curpdata.codigo = "04"; 
        response.data.curpdata.mensaje = "El campo Tipo es requerido."; 
    }
    else if(req.tipo_busqueda != "curp" && req.tipo_busqueda != "datos") response.message = "Parámetro tipo_busqueda valor invalido";
    else if(req.tipo_busqueda == "curp" && !req.curp){
        response.message = "El campo curp no cumple con el formato o contiene caracteres inválidos.";
        response.data = {};
        response.data.curpdata = {};
        response.data.curpdata.codigo = "05"; 
        response.data.curpdata.mensaje = "El campo curp no cumple con el formato o contiene caracteres inválidos."; 
    }
    else if(req.tipo_busqueda == "datos" && !req.clave_entidad) response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !req.dia_nacimiento) response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !req.mes_nacimiento) response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !req.nombres) response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !req.primer_apellido) response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !req.segundo_apellido) response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !req.anio_nacimiento) response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !req.anio_nacimiento) response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !req.sexo) response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && areFieldsEmpty(req))response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !isDateValid(req.anio_nacimiento, req.mes_nacimiento, req.dia_nacimiento))response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !isStateValid(req.clave_entidad))response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !isGeneroValid(req.sexo))response = responseErrorGeneral;
    else if(req.tipo_busqueda == "datos" && !isYearValid(req.anio_nacimiento))response = responseErrorGeneral;

    if(response.message !== "") response.code = 120;

    return response;
}
function areFieldsEmpty(req){
    return (req.clave_entidad == "" 
            || req.dia_nacimiento =="" 
            || req.nombres =="" 
            || req.primer_apellido =="" 
            || req.segundo_apellido =="" 
            || req.anio_nacimiento ==""
            || req.sexo == ""
            );
}
function isYearValid(year){
    console.log(moment().year());
    console.log(parseInt(year));
    return  isNumeric(year) && parseInt(year) >= 1890 && parseInt(year) <= moment().year();
}
function isNumeric(str) {
    if (typeof str != "string") return false 
    return !isNaN(str);
}
function isDateValid(year, month, day){
    return moment(`${year}-${month}-${day}`, "YYYY-MM-DD", true).isValid();
}
function isStateValid(state){
        return estados.includes(state);
}
function isGeneroValid(sexo){
    return generos.includes(sexo);
}
