(function(){var A={};if(typeof window.Jaxer=="undefined"){window.Jaxer={}}Jaxer.isOnServer=false;if(typeof Jaxer.Config=="undefined"){Jaxer.Config={}}if(typeof Jaxer.Server=="undefined"){Jaxer.Server={}}for(var D in A){Jaxer.Config[D]=A[D]}if(typeof Jaxer.Log=="undefined"){function C(){this.trace=this.debug=this.info=this.warn=this.error=this.fatal=function(){}}var B=new C();Jaxer.Log=B;Jaxer.Log.forModule=function(){return B}}})();(function(){var Serialization={};Serialization.SERIALIZE_ACTION="serialize";Serialization.THROW_ACTION="throw";Serialization.TRUNCATE_ACTION="truncate";Serialization.NULLIFY_ACTION="nullify";Serialization.RETURN_OBJECT_ACTION="return object";var TRUNCATION_MESSAGE="__truncated__";var DEFAULT_MAX_DEPTH=10;var MAX_DEPTH_PROPERTY="maxDepth";var MAX_DEPTH_ACTION_PROPERTY="maxDepthAction";var DATE_SERIALIZATION_ACTION_PROPERTY="dateSerializationAction";var SPECIAL_NUMBER_SERIALIZATION_ACTION_PROPERTY="specialNumberSerializationAction";var UNDEFINED_SERIALIZATION_ACTION_PROPERTY="undefinedSerializationAction";var USE_CUSTOM_SERIALIZERS_PROPERTY="useCustomSerializers";var ID_PROPERTY="$id";var ITEMS_PROPERTY="$items";Serialization.JAXER_METHOD="Jaxer";Serialization.JSON_METHOD="JSON";Serialization.NATIVE_JSON_METHOD="nativeJSON";var JSON_SYNTAX_ERROR_NAME="JSONSyntaxError";var JSON_EVAL_ERROR_NAME="JSONEvalError";var NO_RESULT="undefined";var VALID_TYPE_PATTERN=/^[a-zA-Z_$](?:[-a-zA-Z0-9_$]*)(?:\.[a-zA-Z_$](?:[-a-zA-Z0-9_$]*))*$/;var DATE_PATTERN=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;var typeHandlers={};var serializers={};var deserializers={};function ArrayToJSON(ary,options){options=Jaxer.Util.protectedClone(options);options[MAX_DEPTH_PROPERTY]--;if(options[MAX_DEPTH_PROPERTY]<0){var action=options[MAX_DEPTH_ACTION_PROPERTY]||Serialization.THROW_ACTION;switch(action){case Serialization.TRUNCATE_ACTION:return'"'+TRUNCATION_MESSAGE+'"';case Serialization.THROW_ACTION:throw new Error("Maximum recursion depth has been exceeded");break}}var result=[];var length=ary.length;for(var i=0;i<length;i++){var item=ary[i];if(isSerializeable(item)){result.push(toCrockfordJSONString(item,options))}}return"["+result.join(",")+"]"}function clearHandlerCache(){for(var name in typeHandlers){typeHandlers[name].constructor=null}}function DateToJSON(data){function pad(n){return n<10?"0"+n:n}return'"'+data.getFullYear()+"-"+pad(data.getUTCMonth()+1)+"-"+pad(data.getUTCDate())+"T"+pad(data.getUTCHours())+":"+pad(data.getUTCMinutes())+":"+pad(data.getUTCSeconds())+'"'}function walk(property,obj,filter){if(obj&&typeof obj==="object"){for(var p in obj){if(obj.hasOwnProperty(p)){obj[p]=walk(p,obj[p],filter)}}}return filter(property,obj)}function evalJSONString(json,options){var result=NO_RESULT;var simpleValuePattern=(options[SPECIAL_NUMBER_SERIALIZATION_ACTION_PROPERTY]===Serialization.SERIALIZE_ACTION)?/"[^"\\\n\r]*"|true|false|null|undefined|NaN|[-+]?Infinity|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g:/"[^"\\\n\r]*"|true|false|null|undefined|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;if(/^[\],:{}\s]*$/.test(json.replace(/\\["\\\/bfnrtu]/g,"@").replace(simpleValuePattern,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){try{result=eval("("+json+")")}catch(e){var err=new Error("parseJSON: exception '"+e+"' when evaluating: "+json);err.name=JSON_EVAL_ERROR_NAME;throw err}}else{var err=new Error("parseJSON: unexpected characters in: "+json);err.name=JSON_SYNTAX_ERROR_NAME;throw err}return result}function findHandlerName(item){var result=null;for(var name in typeHandlers){if(typeHandlers[name].canSerialize(item)){result=name;break}}return result}function fromCrockfordJSONString(json,options){function filter(property,value){var result=value;if(typeof value==="string"){var match;if(match=value.match(DATE_PATTERN)){var win=getWindow();result=new win.Date(Date.UTC(match[1],match[2]-1,match[3],match[4],match[5],match[6]))}}return result}var result=evalJSONString(json,options);if(result){result=walk("",result,filter)}return result}function fromJaxerJSONString(json,options){var REFERENCE_PATTERN=/^~(\d+)~$/;var REFERENCE_STRING=/('~\d+~'|"~\d+~")/;var CUSTOM_SERIALIZATION_PATTERN=/^~([a-zA-Z_$](?:[-a-zA-Z0-9_$]*)(?:\.[a-zA-Z_$](?:[-a-zA-Z0-9_$]*))*):([\s\S]+)~$/;function Reference(object,property,index){this.object=object;this.property=property;this.index=index}Reference.prototype.setValue=function(nodes){var result=false;if(0<=this.index&&this.index<nodes.length){this.object[this.property]=nodes[this.index];result=true}return result};function postProcess(input){var result=input;if(input.length>0){var valid=true;inputLoop:for(var i=0;i<input.length;i++){var item=input[i];if(item===null||item===undefined){valid=false;break}var type=item.constructor;var itemGlobal=getWindow(item);switch(type){case itemGlobal.Array:postProcessArray(item);break;case itemGlobal.Object:postProcessObject(item);break;case itemGlobal.String:postProcessMember(input,i);break;default:valid=false;break inputLoop}}if(valid){if(references.length>0){result=input[0];for(var i=0;i<references.length;i++){var success=references[i].setValue(input);if(success===false){result=input;break}}}}}return result}function postProcessArray(ary){var result=true;for(var i=0;i<ary.length;i++){if(postProcessMember(ary,i)===false){result=false;break}}return result}function postProcessObject(obj,references){var result=true;for(var p in obj){if(postProcessMember(obj,p)===false){result=false;break}}return result}function postProcessMember(obj,property){var item=obj[property];var result=true;if(item!==null&&item!==undefined){var type=item.constructor;var itemGlobal=getWindow(item);switch(type){case itemGlobal.Array:if(item.length>0){result=false}break;case itemGlobal.Object:for(var p in item){result=false;break}break;case itemGlobal.String:var match;if(match=item.match(REFERENCE_PATTERN)){var index=match[1]-0;var ref=new Reference(obj,property,index);references.push(ref)}else{if(match=item.match(CUSTOM_SERIALIZATION_PATTERN)){var name=match[1];var serializedString=match[2];var handler=typeHandlers[name];if(handler&&handler.canDeserialize&&handler.canDeserialize(serializedString)){obj[property]=handler.deserializer(serializedString)}}}break}}return result}function filter(property,value){var result=value;if(typeof value==="string"){var match;if(match=value.match(CUSTOM_SERIALIZATION_PATTERN)){var name=match[1];var serializedString=match[2];var handler=typeHandlers[name];if(handler&&handler.canDeserialize&&handler.canDeserialize(serializedString)){result=handler.deserializer(serializedString)}}}return result}var result=evalJSONString(json,options);var references=[];if(result){var itemGlobal=getWindow(result);if(result.constructor===itemGlobal.Array){if(REFERENCE_STRING.test(json)){result=postProcess(result)}else{result=walk("",result,filter)}}else{result=walk("",result,filter)}}return result}function getWindow(object){var globalContext;var hasParent=object!==null&&typeof (object)!=="undefined"&&object.__parent__!==null&&typeof (object.__parent__)!=="undefined";if(hasParent){var current=object;var parent=object.__parent__;while(parent&&parent!==current){current=parent;parent=parent.__parent__}if(current!=object){globalContext=current}}if(!globalContext){if(Jaxer.isOnServer){globalContext=Jaxer.pageWindow||Jaxer.frameworkGlobal}else{globalContext=window}}return globalContext}function isSerializeable(obj){var result=false;if(obj===null||obj===undefined){result=true}else{switch(typeof obj){case"string":case"number":case"boolean":case"object":result=true;break;case"function":result=(obj.constructor===getWindow(obj).RegExp);break}}return result}function ObjectToJSON(data,options){options=Jaxer.Util.protectedClone(options);options[MAX_DEPTH_PROPERTY]--;if(options[MAX_DEPTH_PROPERTY]<0){var action=options[MAX_DEPTH_ACTION_PROPERTY]||Serialization.THROW_ACTION;switch(action){case Serialization.TRUNCATE_ACTION:return'"'+TRUNCATION_MESSAGE+'"';case Serialization.THROW_ACTION:throw new Error("Maximum recursion depth has been exceeded");break}}var result=[];for(var k in data){var p='"'+k+'":';var v=data[k];if(isSerializeable(v)){result.push(p+toCrockfordJSONString(v,options))}}return"{"+result.join(",")+"}"}function StringToJSON(data,options){var characterMap={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"};if(/["\\\x00-\x1f]/.test(data)){return'"'+data.replace(/([\x00-\x1f\\"])/g,function(a,b){var c=characterMap[b];if(c){return c}c=b.charCodeAt();return"\\u00"+Math.floor(c/16).toString(16)+(c%16).toString(16)})+'"'}return'"'+data+'"'}function toCrockfordJSONString(data,options){var result=NO_RESULT;if(isSerializeable(data)){if(data===null){result="null"}else{if(data===undefined){var action=options[UNDEFINED_SERIALIZATION_ACTION_PROPERTY]||Serialization.THROW_ACTION;switch(action){case Serialization.SERIALIZE_ACTION:result="undefined";break;case Serialization.NULLIFY_ACTION:result="null";break;case Serialization.THROW_ACTION:default:throw new Error("Serialization of 'undefined' is not supported unless the undefinedSerializationAction option is set to 'serialize'")}}else{var ctor=data.constructor;var dataGlobal=getWindow(data);switch(ctor){case dataGlobal.Array:result=ArrayToJSON(data,options);break;case dataGlobal.Boolean:result=String(data,options);break;case dataGlobal.Number:if(isFinite(data)===false){var action=options[SPECIAL_NUMBER_SERIALIZATION_ACTION_PROPERTY]||Serialization.THROW_ACTION;switch(action){case Serialization.SERIALIZE_ACTION:result=String(data,options);break;case Serialization.NULLIFY_ACTION:result="null";break;case Serialization.THROW_ACTION:default:throw new Error("Serialization of special numbers is not supported unless the specialNumberSerializationAction option is set to 'serialize'")}}else{result=String(data,options)}break;case dataGlobal.Object:result=ObjectToJSON(data,options);break;case dataGlobal.String:result=StringToJSON(data,options);break;case dataGlobal.Function:break;default:if(options[USE_CUSTOM_SERIALIZERS_PROPERTY]){var typeName=findHandlerName(data);if(typeName!==null){result=StringToJSON("~"+typeName+":"+typeHandlers[typeName].serializer(data)+"~")}else{result=ObjectToJSON(data,options)}}else{if(ctor===dataGlobal.Date){var action=options[DATE_SERIALIZATION_ACTION_PROPERTY]||Serialization.THROW_ACTION;switch(action){case Serialization.SERIALIZE_ACTION:result=DateToJSON(data);break;case Serialization.NULLIFY_ACTION:result="null";break;case Serialization.RETURN_OBJECT_ACTION:result="{}";break;case Serialization.THROW_ACTION:default:throw new Error("Serialization of Dates is not supported unless the dateSerializationAction option is set to 'serialize'")}}else{result=ObjectToJSON(data,options)}}break}}}}return result}function toJaxerJSONString(data,options){var result=NO_RESULT;var wrappedItems=[];function WrappedObject(id,object){this[ID_PROPERTY]=id;this.object=object;wrappedItems.push(this)}function isWrappedItem(object){var length=wrappedItems.length;var result=false;for(var i=0;i<length;i++){var wrappedItem=wrappedItems[i];if(wrappedItem.object===object){result=true;break}}return result}function getWrappedItem(object){var length=wrappedItems.length;var result=object;for(var i=0;i<length;i++){var wrappedItem=wrappedItems[i];if(wrappedItem.object===object){result=wrappedItem;break}}return result}function tagReferences(){var result=false;var index=0;var queue=[data];while(queue.length>0){var item=queue.shift();if(item!==null&&item!==undefined){if(!item.hasOwnProperty||(item.hasOwnProperty(ID_PROPERTY)===false&&isWrappedItem(item)===false)){if(typeof (item)==="object"||typeof (item)==="function"){var type=item.constructor;var itemGlobal=getWindow(item);if(type===itemGlobal.Array){if(item.length>0){item[ID_PROPERTY]=index;options[ITEMS_PROPERTY][index]=item;index++;for(var i=0;i<item.length;i++){if(isSerializeable(item[i])){queue.push(item[i])}}}}else{var handlerName=findHandlerName(item);if(type===itemGlobal.Object||handlerName!==null){try{item[ID_PROPERTY]=index;options[ITEMS_PROPERTY][index]=item}catch(e){options[ITEMS_PROPERTY][index]=new WrappedObject(index,item)}index++}if(handlerName===null){for(var p in item){if(p!==ID_PROPERTY){try{if(isSerializeable(item[p])){queue.push(item[p])}}catch(e){Jaxer.Log.debug("During serialization, could not access property "+p+" so it will be ignored")}}}}}}}else{result=true}}}return result}function toJSONWithReferences(){var items=options[ITEMS_PROPERTY];var references=[];for(var i=0;i<items.length;i++){var item=items[i];if(item.constructor===WrappedObject){item=item.object}var type=item.constructor;var itemGlobal=getWindow(item);switch(type){case itemGlobal.Array:var parts=[];for(var j=0;j<item.length;j++){var elem=getWrappedItem(item[j]);if(elem!==undefined&&elem!==null&&elem.hasOwnProperty&&elem.hasOwnProperty(ID_PROPERTY)){parts.push('"~'+elem[ID_PROPERTY]+'~"')}else{parts.push(toCrockfordJSONString(elem,options))}}references.push("["+parts.join(",")+"]");break;case itemGlobal.Object:var parts=[];for(var p in item){if(p!==ID_PROPERTY){var elem=getWrappedItem(item[p]);var k='"'+p+'":';if(elem!==undefined&&elem!==null&&elem.hasOwnProperty&&elem.hasOwnProperty(ID_PROPERTY)){parts.push(k+'"~'+elem[ID_PROPERTY]+'~"')}else{parts.push(k+toCrockfordJSONString(elem,options))}}}references.push("{"+parts.join(",")+"}");break;default:var typeHandler=findHandlerName(item);if(typeHandler!==null){references.push(toCrockfordJSONString(item,options))}else{}break}}return"["+references.join(",")+"]"}function untagReferences(){var items=options[ITEMS_PROPERTY];for(var i=0;i<items.length;i++){var item=items[i];if(item.constructor!==WrappedObject){delete item[ID_PROPERTY]}}}if(data!==undefined){if(tagReferences()===false){untagReferences();result=toCrockfordJSONString(data,options)}else{result=toJSONWithReferences();untagReferences()}}return result}Serialization.addDeserializer=function(name,deserializer,beforeDeserialization,afterDeserialization){if(typeof (name)==="string"&&typeof (deserializer)==="function"){name=name.toLocaleLowerCase();if(name!==Serialization.JAXER_METHOD||deserializers.hasOwnProperty(Serialization.JAXER_METHOD)===false){var handler={deserializer:deserializer,beforeDeserialization:(typeof (beforeDeserialization)==="function")?beforeDeserialization:function(){},afterDeserialization:(typeof (afterDeserialization)==="function")?afterDeserialization:function(){}};deserializers[name]=handler}}};Serialization.addSerializer=function(name,serializer,beforeSerialization,afterSerialization){if(typeof (name)==="string"&&typeof (serializer)==="function"){name=name.toLocaleLowerCase();if(name!==Serialization.JAXER_METHOD||serializers.hasOwnProperty(Serialization.JAXER_METHOD)===false){var handler={serializer:serializer,deserializer:(typeof (deserializer)==="function")?deserializer:function(){},beforeSerialization:(typeof (beforeSerialization)==="function")?beforeSerialization:function(){},afterSerialization:(typeof (afterSerialization)==="function")?afterSerialization:function(){}};serializers[name]=handler}}};Serialization.addTypeHandler=function(name,serializer,deserializer,canSerialize,canDeserialize){if(typeof (name)==="string"&&VALID_TYPE_PATTERN.test(name)&&typeof (serializer)==="function"&&typeof (deserializer)==="function"){var handler={constructor:null,serializer:serializer,deserializer:deserializer};if(typeof (canSerialize)==="function"){handler.canSerialize=canSerialize}else{handler.canSerialize=function(item){var result=false;var parts=name.split(/\./);var candidate=getWindow(item);for(var i=0;i<parts.length;i++){var part=parts[i];if(candidate&&((candidate.hasOwnProperty&&candidate.hasOwnProperty(part))||(part in candidate))){candidate=candidate[part]}else{candidate=null;break}}if(candidate!==null){result=candidate===item.constructor}return result}}if(typeof (canDeserialize)==="function"){handler.canDeserialize=canDeserialize}else{handler.canDeserialize=function(str){return true}}typeHandlers[name]=handler}};Serialization.fromJSONString=function fromJSONString(json,options){var result=NO_RESULT;if(options&&typeof (options)==="object"){var clone=Jaxer.Util.protectedClone(options);if(options.hasOwnProperty("as")===false){clone.as=Serialization.NATIVE_JSON_METHOD}options=clone}else{options={as:Serialization.NATIVE_JSON_METHOD}}var deserializerName=options.as.toLocaleLowerCase();if(serializers.hasOwnProperty(deserializerName)){var handler=deserializers[deserializerName];handler.beforeDeserialization(options);result=handler.deserializer(json,options);handler.afterDeserialization(options)}else{throw new Error("Unknown deserialization method: '"+options.as+"'")}return result};Serialization.removeSerializer=function(name){var result=false;if(typeof (name)==="string"){name=name.toLocaleLowerCase();if(name!==Serialization.JAXER_METHOD){result=delete serializers[name]}}return result};Serialization.removeTypeHandler=function(name){var result=false;if(typeof (name)==="string"){result=delete typeHandlers[name]}return result};Serialization.toJSONString=function(data,options){var result=NO_RESULT;if(options&&typeof (options)==="object"){var clone=Jaxer.Util.protectedClone(options);if(options.hasOwnProperty("as")===false){clone.as=Serialization.NATIVE_JSON_METHOD}options=clone}else{options={as:Serialization.NATIVE_JSON_METHOD}}var serializerName=options.as.toLocaleLowerCase();if(serializers.hasOwnProperty(serializerName)){var handler=serializers[serializerName];handler.beforeSerialization(options);result=handler.serializer(data,options);handler.afterSerialization(options)}else{throw new Error("Unknown serialization method: '"+options.as+"'")}return result};(function(){function initOptions(options){var defaults={};defaults[MAX_DEPTH_PROPERTY]=DEFAULT_MAX_DEPTH;defaults[MAX_DEPTH_ACTION_PROPERTY]=Serialization.TRUNCATE_ACTION;defaults[USE_CUSTOM_SERIALIZERS_PROPERTY]=true;defaults[UNDEFINED_SERIALIZATION_ACTION_PROPERTY]=Serialization.SERIALIZE_ACTION;defaults[SPECIAL_NUMBER_SERIALIZATION_ACTION_PROPERTY]=Serialization.SERIALIZE_ACTION;Jaxer.Util.safeSetValues(options,defaults);clearHandlerCache()}Serialization.addSerializer(Serialization.JAXER_METHOD,toJaxerJSONString,function beforeJaxerSerialization(options){initOptions(options);options[ITEMS_PROPERTY]=[]},function afterJaxerSerialization(options){delete options[ITEMS_PROPERTY]});Serialization.addDeserializer(Serialization.JAXER_METHOD,fromJaxerJSONString,initOptions)})();(function(){function initOptions(options){var defaults={};defaults[MAX_DEPTH_PROPERTY]=DEFAULT_MAX_DEPTH;defaults[MAX_DEPTH_ACTION_PROPERTY]=Serialization.THROW_ACTION;defaults[DATE_SERIALIZATION_ACTION_PROPERTY]=Serialization.SERIALIZE_ACTION;defaults[UNDEFINED_SERIALIZATION_ACTION_PROPERTY]=Serialization.NULLIFY_ACTION;defaults[SPECIAL_NUMBER_SERIALIZATION_ACTION_PROPERTY]=Serialization.NULLIFY_ACTION;Jaxer.Util.safeSetValues(options,defaults);options[USE_CUSTOM_SERIALIZERS_PROPERTY]=false}Serialization.addSerializer(Serialization.JSON_METHOD,toCrockfordJSONString,initOptions);Serialization.addDeserializer(Serialization.JSON_METHOD,fromCrockfordJSONString,initOptions)})();(function(){var defaults={};defaults[MAX_DEPTH_PROPERTY]=DEFAULT_MAX_DEPTH;defaults[MAX_DEPTH_ACTION_PROPERTY]=Serialization.THROW_ACTION;defaults[DATE_SERIALIZATION_ACTION_PROPERTY]=Serialization.RETURN_OBJECT_ACTION;defaults[UNDEFINED_SERIALIZATION_ACTION_PROPERTY]=Serialization.NULLIFY_ACTION;defaults[SPECIAL_NUMBER_SERIALIZATION_ACTION_PROPERTY]=Serialization.NULLIFY_ACTION;function hasNativeJSON(){var window=getWindow();var result=false;if(window&&"JSON" in window){if("stringify" in window.JSON){result=true}}return result}Serialization.addSerializer(Serialization.NATIVE_JSON_METHOD,function(data,options){if(hasNativeJSON()){return JSON.stringify(data)}else{return toCrockfordJSONString(data,defaults)}});Serialization.addDeserializer(Serialization.NATIVE_JSON_METHOD,function(json,options){if(hasNativeJSON()){return JSON.parse(json)}else{return fromCrockfordJSONString(json,defaults)}})})();Serialization.addTypeHandler("Date",function serializeDate(date){function pad(n){return n<10?"0"+n:n}return date.getUTCFullYear()+"-"+pad(date.getUTCMonth()+1)+"-"+pad(date.getUTCDate())+"T"+pad(date.getUTCHours())+":"+pad(date.getUTCMinutes())+":"+pad(date.getUTCSeconds())},function deserializeDate(serializedDate){var match=serializedDate.match(DATE_PATTERN);var result=null;if(match!==null){var win=getWindow();result=new win.Date(Date.UTC(match[1],match[2]-1,match[3],match[4],match[5],match[6]))}return result});Serialization.addTypeHandler("RegExp",function serializeRegExp(regex){return regex.toString()},function deserializeRegExp(serializedRegex){var match=serializedRegex.match(/^\/(.+)\/([a-zA-Z]+)?$/);var result=serializedRegex;if(match!==null){var win=getWindow();result=new win.RegExp(match[1],match[2])}return result});var tryXMLDocument=true;Serialization.addTypeHandler("XMLDocument",function serializeXMLDocument(doc){var win=getWindow();var result=null;if(win.XMLSerializer){var serializer=new win.XMLSerializer();result=serializer.serializeToString(doc)}else{result=doc.xml}return result},function deserializeXMLDocument(xml){var win=getWindow();var result=null;if(win.DOMParser){var parser=new win.DOMParser();result=parser.parseFromString(xml,"application/xml")}else{if(win.ActiveXObject){try{var doc=new win.ActiveXObject("Microsoft.XMLDOM");doc.async=false;doc.loadXML(xml);result=doc}catch(e){if(!Jaxer.isOnServer){tryXMLDocument=false}}}}return result},function canSerializeXMLDocument(data){if(!Jaxer.isOnServer&&!tryXMLDocument){return false}var win=getWindow(data);if(data&&win.XMLSerializer&&data.constructor==win.XMLDocument){return true}if(data&&win.ActiveXObject&&(typeof data.constructor=="undefined")&&(typeof data.xml=="string")){return true}if(!Jaxer.isOnServer){tryXMLDocument=false}return false},function canDeserializeXMLDocument(str){if(!Jaxer.isOnServer&&!tryXMLDocument){return false}var win=getWindow();if(win.DOMParser){return true}if(win.ActiveXObject){return true}if(!Jaxer.isOnServer){tryXMLDocument=false}return false});Jaxer.Serialization=Serialization;if(Jaxer.isOnServer){frameworkGlobal.Serialization=Jaxer.Serialization}})();(function(){var F=Jaxer.Log.forModule("XHR");function C(){if(Jaxer.isOnServer){return Jaxer.pageWindow||this.__parent__}else{return window}}var H={};H.REASON_TIMEOUT="timeout";H.REASON_FAILURE="failure";H.asyncRequests={};H.onfailure=function G(N,L,P){if(P){var M;try{M=P.status}catch(O){}throw new Error("XMLHttpRequest: Received status "+String(P.status)+" from the server\nResponse from server: "+P.responseText)}else{if(N){throw N}}};H.ontimeout=function A(M,L,N){throw new Error("XMLHttpRequest: Request timed out after "+(M.timeout/1000)+" seconds")};H.getTransport=function J(){var N,M,L;L=C();try{N=L.ActiveXObject?new L.ActiveXObject("Microsoft.XMLHTTP"):new L.XMLHttpRequest()}catch(M){}if(!N){throw new Error("Could not create XMLHttpRequest"+(M?"\n"+M:""))}return N};H.testSuccess=function E(O){var N=false;var M=C();try{N=(!O.status&&M.location&&M.location.protocol=="file:")||(O.status>=200&&O.status<300)||(O.status==304)||(M.navigator&&M.navigator.userAgent.match(/webkit/)&&O.status==undefined)}catch(L){}return N};H.send=function D(P,a,AA){var q=C();var o=(typeof q.XMLSerializer=="function")?new q.XMLSerializer():null;var r=(typeof q.XML=="function")?q.XML:null;if(typeof P!="string"){if((P==null)||(P==undefined)||(typeof P.toString!="function")){P=""}else{P=P.toString()}}a=a||{};var O=a.as||H.defaults.as||"";O=O.toLowerCase();var N=a.url||H.defaults.url||Jaxer.CALLBACK_URI;N=N.replace(/#.*$/,"");var f=(typeof a.cacheBuster=="undefined")?H.defaults.cacheBuster:a.cacheBuster;if(f){N+=(N.match(/\?/)?"&":"?")+"_rnd"+((new Date()).getTime())+"="+Math.random()}var v=String(a.method||H.defaults.method||"GET").toUpperCase();if((v=="GET")&&(P!="")){N+=(N.match(/\?/)?"&":"?")+P;P=""}var l=(typeof a.async=="undefined")?H.defaults.async:a.async;var i=a.username||H.defaults.username||null;var g=a.password||H.defaults.password||null;var k=a.onsuccess||H.defaults.onsuccess;var L=a.onfailure||H.defaults.onfailure;var Y=a.onsslcerterror||H.defaults.onsslcerterror;var t=a.timeout||H.defaults.timeout||0;var n=t?(a.ontimeout||H.defaults.ontimeout):null;var p=a.headers||H.defaults.headers;var Q=O?((O=="xml"||O=="e4x")?"application/xml":"text/plain"):a.overrideMimeType||H.defaults.overrideMimeType||null;var S=a.onreadytosend||H.defaults.onreadytosend;var T=a.onfinished||H.defaults.onfinished;var U=a.contentType||H.defaults.contentType;var W=a.testSuccess||H.defaults.testSuccess;if(typeof W!="function"){W=H.testSuccess}var j=O?((O=="xml"||O=="e4x")?O:"text"):a.responseType||H.defaults.responseType||"text";var AB=a.extendedResponse||H.defaults.extendedResponse;var b=a.pollingPeriod||H.defaults.pollingPeriod||11;var h=a.getTransport||H.defaults.getTransport;if(typeof h!="function"){h=H.getTransport}var Z=(typeof k=="function");var c=null;var z=h();try{z.open(v,N,l,i,g)}catch(y){c=new Error("xhr.open error: "+y+"\n\ntypeof xhr: "+(typeof z)+"\n\nparams: "+[v,N,l]);if(Z){if(typeof L=="function"){L(c,AA,z)}return }else{throw c}}if(p&&(typeof p=="object")){if(typeof p.length=="number"){for(var u=0,m=p.length;u<m;u++){z.setRequestHeader(p[u][0],p[u][1])}}else{for(var d in p){z.setRequestHeader(d,p[d])}}}else{if(U!=""){z.setRequestHeader("Content-Type",U)}z.setRequestHeader("X-Requested-With","XMLHttpRequest")}if(Q&&(typeof z.overrideMimeType=="function")){z.overrideMimeType(Q)}if(typeof S=="function"){S(z,AA)}var X=false;var V,x;var R=function R(AJ){var AH;if(!X&&z&&((z.readyState==4)||(AJ=="timedout")||(AJ=="canceled"))){X=true;if(V){x="id_"+V;q.clearInterval(V);delete H.asyncRequests[x]}var AG=null;var AK=(l?"Asynchronous":"Synchronous")+" request "+(x?x+" ":"")+"to url "+N;if(AJ=="timedout"){F.trace(AK+" timed out");AG=new Error(AK+" timed out");AG.reason=H.REASON_TIMEOUT;AG.timeout=t;if(Z&&(typeof n=="function")){n(AG,AA,z)}}else{if(AJ=="canceled"){F.trace(AK+" canceled")}else{if(W(z)){var AD;switch(j){case"xml":case"e4x":AD=true;break;case"auto":var AP="text";try{AP=z.getResponseHeader("content-type")}catch(AL){}AD=Boolean(AP.match(/xml/i));break;default:AD=false}AH=AD?z.responseXML:z.responseText;if(j=="e4x"&&o&&r){var AN=o.serializeToString(AH.documentElement);AH=new r(AN)}var AM=AD?z.responseText:AH;F.trace(AK+" received "+(AD?"XML":"text")+" response: "+AM.substr(0,100)+(AM.length>100?"...":""));if(AB){var AO=z.getAllResponseHeaders();var AF={};if(AO){AO.split(/[\r\n]+/).forEach(function(e){var AR=/^([^\:]+)\: (.*)$/.exec(e);if(AR&&AR.length==3){var AS=AR[1];var AQ=AR[2];if(AS in AF){if(typeof AF[AS]=="string"){AF[AS]=[AF[AS],AQ]}else{AF[AS].push(AQ)}}else{AF[AS]=AQ}}})}var AI=AF["Set-Cookie"];var AE=AI?(typeof AI=="string"?[AI]:AI):[];AH=new H.ResponseData({response:AH,text:z.responseText,xml:z.responseXML,xhr:z,extra:AA,headers:AF,status:z.status,statusText:z.statusText,cookies:Jaxer.Util.Cookie.parseSetCookieHeaders(AE),certInfo:s})}if(Z){k(AH,AA)}}else{F.trace(AK+" failed");AG=new Error(AK+" failed");AG.reason=H.REASON_FAILURE;AG.status=z.status;if(Z&&(typeof L=="function")){L(AG,AA,z)}}}}if(typeof T=="function"){T(z,AJ,AA)}V=x=z=N=undefined;if(!Z&&AG){throw AG}}if(!Z){return AH}};if(l){V=q.setInterval(R,b);x="id_"+V;H.asyncRequests[x]={url:N,message:P,timeout:t,timestamp:new Date(),finish:R};if(t){q.setTimeout(function w(){if(!z){return }z.abort();if(!X){R("timedout")}},t)}}var s=null;if(Jaxer.isOnServer){z.onsslcerterror=function(AE,AF,AD){var e=AF.serverCert;s=new Util.Certificate.CertInfo(AE,AF,AD);var AG=false;if(typeof Y=="function"){AG=Y(s,e,AE,AF,AD)}return AG}}F.trace("Sending "+(l?"asynchronous ":"synchronous ")+v+" request to url "+N+" with "+(P==""?"no data":"data: "+P));z.send((P=="")?null:P);F.trace("Sent");if(l){F.trace("Response will be received asynchronously with key: "+x);return x}else{var M=R(false);if((typeof (M)=="object")&&("documentElement" in M)){var AC=M.documentElement;if(AC&&AC.nodeName=="parsererror"){c=new Error("Error reading returned XML: "+AC.firstChild.data+"\nXHR params: "+[v,N,l]);if(Z){if(typeof L=="function"){L(c,AA,z)}}else{throw c}}}if(!Z){return M}}};H.cancel=function K(L){if(typeof H.asyncRequests[L]!="undefined"){F.trace("Canceling request "+L);H.asyncRequests[L].finish("canceled");return true}else{return false}};H.ResponseData=function I(L){this.response=L.response;this.text=L.text;this.xml=L.xml;this.xhr=L.xhr;this.certInfo=L.certInfo;this.extra=L.extra;this.headers=L.headers;this.status=L.status;this.statusText=L.statusText;this.cookies=L.cookies};H.SendOptions=function B(){this.url=Jaxer.CALLBACK_URI;this.cacheBuster=Jaxer.isOnServer?false:true;this.method=Jaxer.isOnServer?"GET":"POST";this.async=Jaxer.isOnServer?false:true;this.username=null;this.password=null;this.onsuccess=null;this.onfailure=Jaxer.isOnServer?null:H.onfailure;this.onsslcerterror=null;this.timeout=H.SendOptions.DEFAULT_TIMEOUT;this.ontimeout=null;this.headers=null;this.as=null;this.overrideMimeType=null;this.onreadytosend=null;this.onfinished=null;this.contentType="application/x-www-form-urlencoded";this.extendedResponse=false;this.testSuccess=H.testSuccess;this.responseType="text";this.pollingPeriod=11;this.getTransport=H.getTransport};H.SendOptions.DEFAULT_TIMEOUT=Jaxer.isOnServer?30000:0;H.defaults=new H.SendOptions();Jaxer.XHR=H})();(function(){var L=Jaxer.Log.forModule("Callback");var C="exception";var M="isClientError";var D="options";var c="info";var P="wrapped";var a="pageSignature";var B="pageName";var b="callingPage";var T="methodName";var K="name";var A="message";var N="params";var Y="returnValue";var O="uid";var H={};H.METHOD="POST";H.TIMEOUT=10*1000;H.POLLING_PERIOD=11;H.createQuery=function R(g,d,j){var h=[];j=j||0;for(var f=j;f<d.length;f++){h.push(d[f])}var e=H.getQueryParts(g,h);return H.hashToQuery(e)};H.hashToQuery=function E(h){var f=[];for(var g in h){var d=H.formUrlEncode(g);var e=((typeof h[g]=="undefined")||(h[g]==null)||(typeof h[g].toString!="function"))?"":H.formUrlEncode(h[g].toString());f.push([d,e].join("="))}return f.join("&")};H.formUrlEncode=function Q(d){return encodeURIComponent(d)};H.processReturnValue=function U(s,t){L.trace("Received for function "+s+": rawResult = "+t.substr(0,100)+(t.length>100?"...":""));try{var q=Jaxer.Serialization.fromJSONString(t,{as:Jaxer.Serialization.JAXER_METHOD})}catch(o){var n,l,m;if(o.name==Jaxer.Serialization.JSONSyntaxErrorName){n="Received a response with an unexpected (non-JSON) syntax";l=false;m=true}else{if(o.name==Jaxer.Serialization.JSONEvalErrorName){n="Error when evaluating the JSON-like response received from the server";l=true;m=true}else{n="Error when processing the JSON response received from the server";l=true;m=false}}o.message=n+" while calling server function '"+s+"'.\n\n"+(l?"Error: "+o+"\n\n":"")+"Response:\n"+t.substr(0,200)+((t.length>200)?"...":"")+(m?"\n\n(Perhaps an error occured on the server?)":"");if(Jaxer.ALERT_CALLBACK_ERRORS){alert(o.message)}throw o}var v=null;if(q!==null&&q!=undefined){if(q.hasOwnProperty(C)){var j,d;if(q[C]){if(q[M]){var k=q[C];var i=k[D];var u=k[c];if(i&&(P in i)&&!i[P]){j=u}else{var h=(u&&(u.message))?String(u.message):String(u);j=new Error(h);if(u&&(typeof u=="object")){for(var f in u){j[f]=u[f]}}}}else{j=q[C]}}else{j="Unspecified server error"}if(j.hasOwnProperty(K)){var r=j[K];try{d=new window[r];for(var f in j){d[f]=j[f]}}catch(o){d=j}}else{d=j}if(typeof d.toString!="function"){d.toString=function g(){var e=d.hasOwnProperty(K)?d[K]:"server error";var p=d.hasOwnProperty(A)?d[A]:"(unspecified)";return[e,p].join(": ")}}if(Jaxer.ALERT_CALLBACK_ERRORS){alert("The server function '"+s+"' returned an error: "+((typeof d.message=="undefined")?d.toString():d.message))}throw d}else{if(q.hasOwnProperty(Y)){v=q[Y]}else{v=undefined}}}return v};H.onfailureAsync=function J(g,d,j){var h="Error while contacting server to (asynchronously) call server function '"+d.functionName+"':\n";if(j){var f;try{f=j.status}catch(i){}h+="Received status "+String(j.status)+" from the server\nResponse from server: "+j.responseText}else{if(g){h+=g}}if(Jaxer.ALERT_CALLBACK_ERRORS){alert(h)}throw new Error(h)};H.ontimeoutAsync=function G(e,d,g){var f="Error while contacting server to (asynchronously) call server function '"+d.functionName+"':\n";f+="Request timed out after "+(e.timeout/1000)+" seconds";if(Jaxer.ALERT_CALLBACK_ERRORS){alert(f)}throw new Error(f)};H.invokeFunctionAsync=function F(k,h,i){var n=H.createQuery(h,i,1);L.trace("Invoking function "+h+" asynchronously with arguments encoded as: "+n);var e={functionName:h};var g,f,j;if(typeof k=="function"){g=k}else{if(typeof k=="object"){if(typeof k.length=="number"){g=(k.length>0&&typeof k[0]=="function")?k[0]:undefined;if(k.length>1&&typeof k[1]=="function"){f=k[1]}if(k.length>2&&typeof k[2]=="number"){j=k[2]}}else{g=(typeof k.callback=="function")?k.callback:undefined;if(typeof k.errorHandler=="function"){f=k.errorHandler}if(typeof k.timeout=="number"){j=k.timeout}}}}var l=function l(p,o){try{var q=H.processReturnValue(h,p);if(g){g(q)}}catch(r){if(f){f(r,o)}}};var m={url:Jaxer.CALLBACK_URI,cacheBuster:false,method:H.METHOD,async:true,onsuccess:l,onfailure:f||H.onfailureAsync,timeout:(typeof j=="number")?j:H.TIMEOUT,ontimeout:f||H.ontimeoutAsync,headers:null,onreadytosend:null,onfinished:null,contentType:"application/x-www-form-urlencoded",testSuccess:Jaxer.XHR.testSuccess,as:"text",pollingPeriod:H.POLLING_PERIOD};var d=Jaxer.XHR.send(n,m,e);return d};H.invokeFunction=function Z(j,h){var i=H.createQuery(j,h);L.trace("Invoking function "+j+" synchronously with arguments encoded as: "+i);var d={functionName:j};var g={url:Jaxer.CALLBACK_URI,cacheBuster:false,method:H.METHOD,async:false,onsuccess:null,onfailure:null,timeout:H.TIMEOUT,ontimeout:null,headers:null,onreadytosend:null,onfinished:null,contentType:"application/x-www-form-urlencoded",testSuccess:Jaxer.XHR.testSuccess,as:"text",pollingPeriod:H.POLLING_PERIOD};try{var f=Jaxer.XHR.send(i,g,d)}catch(k){if(Jaxer.ALERT_CALLBACK_ERRORS){alert("Error while contacting server to call server function '"+j+"': "+k)}throw k}return H.processReturnValue(j,f)};H.getUrl=function W(){var d=H.getQueryParts.apply(this,arguments);return(H.getBaseUrl()+"?"+H.hashToQuery(d))};H.getBaseUrl=function X(){return Jaxer.CALLBACK_URI};H.getQueryParts=function S(d,q){var m={};var r=(typeof d=="function")?d.name:d;if(q==null){q=[]}if(q.constructor!=Array){q=[q]}var o=[];for(var n=0;n<q.length;n++){var h=q[n];var k=Jaxer.Serialization.toJSONString(h,{as:Jaxer.Serialization.JAXER_METHOD});if(k==undefined&&h!=undefined){throw new Error("When calling function "+r+", parameter #"+n+" cannot be sent because it is not serializable: "+h)}o.push(k)}for(var n=2;n<arguments.length;n++){var s=arguments[n];if(typeof s=="string"){var g=s.split("&");for(var l=0;l<g.length;l++){var f=g[l].split("=");m[f[0]]=(f.length>1)?f[1]:null}}else{for(var e in s){m[e]=s[e]}}}m[a]=Jaxer.Callback[a];m[B]=Jaxer.Callback[B];m[b]=Jaxer.Callback[b];m[T]=r;m[N]="["+o.join(",")+"]";m[O]=""+new Date().getTime()+"_"+Math.round(Math.random()*1000000);return m};Jaxer.remote=function I(e,d,f){if(arguments.length==3){return H.invokeFunctionAsync(f,e,d)}else{return H.invokeFunction(e,d)}};H.createProxies=function V(i,f){var h=[];for(var e=0,g=i.length;e<g;e++){var d=i[e];var j=f?(f+"."+d):d;h.push(j+" = function "+d+"() { return Jaxer.remote('"+d+"', arguments); }");h.push(j+".async = function "+d+"_async(callback) { return Jaxer.remote('"+d+"', arguments, callback); }");h.push(j+".getUrl = function "+d+"_getUrl() { return Jaxer.Callback.getUrl.apply(this, Jaxer.Util.concatArrays(['"+d+"'], arguments)); }")}return h.join("\n")};Jaxer.Callback=H})();if(!Jaxer.Util){Jaxer.Util={}}Jaxer.setEvent=function setEvent(E,A,B){if(Jaxer.isOnServer){var D;if(typeof B=="function"){if(B.name==""){D="("+B.toSource()+")()"}else{D=B.name+"()"}}else{D=B}E.setAttribute(A,D)}else{var C;if(typeof B=="function"){C=B}else{C=new Function(B)}E[A]=C}};Jaxer.setTitle=function setTitle(D){if(Jaxer.isOnServer){if(!Jaxer.pageWindow){throw new Exception("Jaxer.pageWindow is not available for some reason")}var C=Jaxer.pageWindow.document;if(!C){throw new Exception("Jaxer.pageWindow.document is not available for some reason")}var B=C.getElementsByTagName("title")[0];if(!B){var A=C.getElementsByTagNames("head")[0];if(A){B=C.createElement("title");A.appendChild(B)}}if(B){B.firstChild.data=D}}else{document.title=D}};Jaxer.Util.concatArrays=function concatArrays(){var C=[];for(var B=0,D=arguments.length;B<D;B++){var A=arguments[B];if(A){for(iArr=0,lenArr=A.length;iArr<lenArr;iArr++){C.push(A[iArr])}}}return C};Jaxer.Util.protectedClone=function(B){var C=function(){};C.prototype=B;var A=new C();A.$parent=B;return A};Jaxer.Util.safeSetValues=function(B,A){for(var C in A){if(!B[C]){B[C]=A[C]}}};(function(){if(!Jaxer.Util){Jaxer.Util={}}Jaxer.Util.Cookie={};Jaxer.Util.Cookie.set=function E(F,H){var G=encodeURIComponent(F)+"="+encodeURIComponent(H)+"; path=/";if(Jaxer.isOnServer){Jaxer.response.addHeader("Set-Cookie",G,false)}else{document.cookie=G}};Jaxer.Util.Cookie.get=function B(F){var H=null;var G=Jaxer.Util.Cookie.getAll();if(typeof G[F]!="undefined"){H=G[F]}return H};function A(M,O){var H={};var N=M.split(/\s*;\s*/);for(var I=0;I<N.length;I++){var L=N[I];var F=/^([^\=]+?)\s*\=\s*(.*?)$/.exec(L);if(F&&F.length==3){var G,K;try{G=decodeURIComponent(F[1])}catch(J){G=F[1];if(Jaxer.isOnServer){Jaxer.Log.debug("Malformed cookie name: name = "+G)}}try{K=decodeURIComponent(F[2])}catch(J){K=F[2];if(Jaxer.isOnServer){Jaxer.Log.debug("Malformed cookie value: name = "+G+", value = "+K)}}if(O&&O[I]){H[O[I][0]]=G;H[O[I][1]]=K}else{H[G]=K}}}return H}Jaxer.Util.Cookie.getAll=function C(){var F=Jaxer.isOnServer?Jaxer.request.headers.Cookie:document.cookie;return(typeof F=="string")?A(F):{}};Jaxer.Util.Cookie.parseSetCookieHeaders=function D(G){if(typeof G=="string"){G=[G]}var H=[];for(var F=0;F<G.length;F++){H.push(A(G[F],{0:["name","value"]}))}return H}})();