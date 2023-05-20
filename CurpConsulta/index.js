const {v1: uuidv1 } = require('uuid'),
moment   = require("moment"),
DB       = require("../Shared/Utils/DB"),
scrapper = require("../Shared/Service/scrapper");


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

        if(response.code === 0 && reqJson.tipo_busqueda == "curp") body = await scrapper.ObtenerCurp(reqJson.curp, response);

        if(response.code === 0 && reqJson.tipo_busqueda == "datos") body = await scrapper.ObtenerCurpByData(reqJson.clave_entidad, reqJson.dia_nacimiento, reqJson.mes_nacimiento,
            reqJson.nombres, reqJson.primer_apellido, reqJson.segundo_apellido, reqJson.anio_nacimiento, reqJson.sexo, response);

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

    if(!req) response.message = "Error en request";
    else if(!req.tipo_busqueda)  response.message = "Parámetro tipo_busqueda requerido";
    else if(req.tipo_busqueda != "curp" && req.tipo_busqueda != "datos") response.message = "Parámetro tipo_busqueda valor invalido";
    else if(req.tipo_busqueda == "curp" && !req.curp){
        response.message = "El campo curp no cumple con el formato o contiene caracteres inválidos.";
        response.data = {};
        response.data.curpdata = {};
        response.data.curpdata.codigo = "05"; 
        response.data.curpdata.mensaje = "El campo curp no cumple con el formato o contiene caracteres inválidos."; 
    }
    else if(req.tipo_busqueda == "datos" && !req.clave_entidad) response.message = "Parámetro clave_entidad requerido";
    else if(req.tipo_busqueda == "datos" && !req.dia_nacimiento) response.message = "Parámetro dia_nacimiento requerido";
    else if(req.tipo_busqueda == "datos" && !req.mes_nacimiento) response.message = "Parámetro mes_nacimiento requerido";
    else if(req.tipo_busqueda == "datos" && !req.nombres) response.message = "Parámetro nombres requerido";
    else if(req.tipo_busqueda == "datos" && !req.primer_apellido) response.message = "Parámetro primer_apellido requerido";
    else if(req.tipo_busqueda == "datos" && !req.segundo_apellido) response.message = "Parámetro segundo_apellido requerido";
    else if(req.tipo_busqueda == "datos" && !req.anio_nacimiento) response.message = "Parámetro anio_nacimiento requerido";
    else if(req.tipo_busqueda == "datos" && !req.sexo) response.message = "Parámetro sexo requerido";

    if(response.message !== "") response.code = 120;

    return response;
}
