!function(a,b){"use strict";function c(a,b){for(var c,d=[],f=0;f<a.length;++f){if(c=g[a[f]]||e(a[f]),!c)throw"module definition dependecy not found: "+a[f];d.push(c)}b.apply(null,d)}function d(a,d,e){if("string"!=typeof a)throw"invalid module definition, module id must be defined and be a string";if(d===b)throw"invalid module definition, dependencies must be specified";if(e===b)throw"invalid module definition, definition function must be specified";c(d,function(){g[a]=e.apply(null,arguments)})}function e(b){for(var c=a,d=b.split(/[.\/]/),e=0;e<d.length;++e){if(!c[d[e]])return;c=c[d[e]]}return c}function f(c){var d,e,f,h,i;for(d=0;d<c.length;d++){e=a,f=c[d],h=f.split(/[.\/]/);for(var j=0;j<h.length-1;++j)e[h[j]]===b&&(e[h[j]]={}),e=e[h[j]];e[h[h.length-1]]=g[f]}if(a.AMDLC_TESTS){i=a.privateModules||{};for(f in g)i[f]=g[f];for(d=0;d<c.length;d++)delete i[c[d]];a.privateModules=i}}var g={};d("tinymce/spellcheckerplugin/DomTextMatcher",[],function(){function a(a){return a&&1==a.nodeType&&"false"===a.contentEditable}return function(b,c){function d(a,b){if(!a[0])throw"findAndReplaceDOMText cannot handle zero-length matches";return{start:a.index,end:a.index+a[0].length,text:a[0],data:b}}function e(b){var c;if(3===b.nodeType)return b.data;if(y[b.nodeName]&&!x[b.nodeName])return"";if(a(b))return"\n";if(c="",(x[b.nodeName]||z[b.nodeName])&&(c+="\n"),b=b.firstChild)do c+=e(b);while(b=b.nextSibling);return c}function f(b,c,d){var e,f,g,h,i,j=[],k=0,l=b,m=0;c=c.slice(0),c.sort(function(a,b){return a.start-b.start}),i=c.shift();a:for(;;){if((x[l.nodeName]||z[l.nodeName]||a(l))&&k++,3===l.nodeType&&(!f&&l.length+k>=i.end?(f=l,h=i.end-k):e&&j.push(l),!e&&l.length+k>i.start&&(e=l,g=i.start-k),k+=l.length),e&&f){if(l=d({startNode:e,startNodeIndex:g,endNode:f,endNodeIndex:h,innerNodes:j,match:i.text,matchIndex:m}),k-=f.length-h,e=null,f=null,j=[],i=c.shift(),m++,!i)break}else if(y[l.nodeName]&&!x[l.nodeName]||!l.firstChild){if(l.nextSibling){l=l.nextSibling;continue}}else if(!a(l)){l=l.firstChild;continue}for(;;){if(l.nextSibling){l=l.nextSibling;break}if(l.parentNode===b)break a;l=l.parentNode}}}function g(a){function b(b,c){var d=A[c];d.stencil||(d.stencil=a(d));var e=d.stencil.cloneNode(!1);return e.setAttribute("data-mce-index",c),b&&e.appendChild(B.doc.createTextNode(b)),e}return function(a){var c,d,e,f=a.startNode,g=a.endNode,h=a.matchIndex,i=B.doc;if(f===g){var j=f;e=j.parentNode,a.startNodeIndex>0&&(c=i.createTextNode(j.data.substring(0,a.startNodeIndex)),e.insertBefore(c,j));var k=b(a.match,h);return e.insertBefore(k,j),a.endNodeIndex<j.length&&(d=i.createTextNode(j.data.substring(a.endNodeIndex)),e.insertBefore(d,j)),j.parentNode.removeChild(j),k}c=i.createTextNode(f.data.substring(0,a.startNodeIndex)),d=i.createTextNode(g.data.substring(a.endNodeIndex));for(var l=b(f.data.substring(a.startNodeIndex),h),m=[],n=0,o=a.innerNodes.length;o>n;++n){var p=a.innerNodes[n],q=b(p.data,h);p.parentNode.replaceChild(q,p),m.push(q)}var r=b(g.data.substring(0,a.endNodeIndex),h);return e=f.parentNode,e.insertBefore(c,f),e.insertBefore(l,f),e.removeChild(f),e=g.parentNode,e.insertBefore(r,g),e.insertBefore(d,g),e.removeChild(g),r}}function h(a){var b=a.parentNode;b.insertBefore(a.firstChild,a),a.parentNode.removeChild(a)}function i(a){var c=b.getElementsByTagName("*"),d=[];a="number"==typeof a?""+a:null;for(var e=0;e<c.length;e++){var f=c[e],g=f.getAttribute("data-mce-index");null!==g&&g.length&&(g!==a&&null!==a||d.push(f))}return d}function j(a){for(var b=A.length;b--;)if(A[b]===a)return b;return-1}function k(a){var b=[];return l(function(c,d){a(c,d)&&b.push(c)}),A=b,this}function l(a){for(var b=0,c=A.length;c>b&&a(A[b],b)!==!1;b++);return this}function m(a){return A.length&&f(b,A,g(a)),this}function n(a,b){if(w&&a.global)for(;v=a.exec(w);)A.push(d(v,b));return this}function o(a){var b,c=i(a?j(a):null);for(b=c.length;b--;)h(c[b]);return this}function p(a){return A[a.getAttribute("data-mce-index")]}function q(a){return i(j(a))[0]}function r(a,b,c){return A.push({start:a,end:a+b,text:w.substr(a,b),data:c}),this}function s(a){var b=i(j(a)),d=c.dom.createRng();return d.setStartBefore(b[0]),d.setEndAfter(b[b.length-1]),d}function t(a,b){var d=s(a);return d.deleteContents(),b.length>0&&d.insertNode(c.dom.doc.createTextNode(b)),d}function u(){return A.splice(0,A.length),o(),this}var v,w,x,y,z,A=[],B=c.dom;return x=c.schema.getBlockElements(),y=c.schema.getWhiteSpaceElements(),z=c.schema.getShortEndedElements(),w=e(b),{text:w,matches:A,each:l,filter:k,reset:u,matchFromElement:p,elementFromMatch:q,find:n,add:r,wrap:m,unwrap:o,replace:t,rangeFromMatch:s,indexOf:j}}}),d("tinymce/spellcheckerplugin/Plugin",["tinymce/spellcheckerplugin/DomTextMatcher","tinymce/PluginManager","tinymce/util/Tools","tinymce/ui/Menu","tinymce/dom/DOMUtils","tinymce/util/XHR","tinymce/util/URI","tinymce/util/JSON"],function(a,b,c,d,e,f,g,h){b.add("spellchecker",function(b,i){function j(){return E.textMatcher||(E.textMatcher=new a(b.getBody(),b)),E.textMatcher}function k(a,b){var d=[];return c.each(b,function(a){d.push({selectable:!0,text:a.name,data:a.value})}),d}function l(a){for(var b in a)return!1;return!0}function m(a,f){var g=[],h=A[a];c.each(h,function(a){g.push({text:a,onclick:function(){b.insertContent(b.dom.encode(a)),b.dom.remove(f),r()}})}),g.push({text:"-"}),D&&g.push({text:"Add to Dictionary",onclick:function(){s(a,f)}}),g.push.apply(g,[{text:"Ignore",onclick:function(){t(a,f)}},{text:"Ignore all",onclick:function(){t(a,f,!0)}}]),C=new d({items:g,context:"contextmenu",onautohide:function(a){-1!=a.target.className.indexOf("spellchecker")&&a.preventDefault()},onhide:function(){C.remove(),C=null}}),C.renderTo(document.body);var i=e.DOM.getPos(b.getContentAreaContainer()),j=b.dom.getPos(f[0]),k=b.dom.getRoot();"BODY"==k.nodeName?(j.x-=k.ownerDocument.documentElement.scrollLeft||k.scrollLeft,j.y-=k.ownerDocument.documentElement.scrollTop||k.scrollTop):(j.x-=k.scrollLeft,j.y-=k.scrollTop),i.x+=j.x,i.y+=j.y,C.moveTo(i.x,i.y+f[0].offsetHeight)}function n(){return b.getParam("spellchecker_wordchar_pattern")||new RegExp('[^\\s!"#$%&()*+,-./:;<=>?@[\\]^_{|}`\xa7\xa9\xab\xae\xb1\xb6\xb7\xb8\xbb\xbc\xbd\xbe\xbf\xd7\xf7\xa4\u201d\u201c\u201e\xa0\u2002\u2003\u2009]+',"g")}function o(a,d,e,j){var k={method:a},l="";"spellcheck"==a&&(k.text=d,k.lang=F.spellchecker_language),"addToDictionary"==a&&(k.word=d),c.each(k,function(a,b){l&&(l+="&"),l+=b+"="+encodeURIComponent(a)}),f.send({url:new g(i).toAbsolute(F.spellchecker_rpc_url),type:"post",content_type:"application/x-www-form-urlencoded",data:l,success:function(a){if(a=h.parse(a))a.error?j(a.error):e(a);else{var c=b.translate("Server response wasn't proper JSON.");j(c)}},error:function(){var a=b.translate("The spelling service was not found: (")+F.spellchecker_rpc_url+b.translate(")");j(a)}})}function p(a,b,c,d){var e=F.spellchecker_callback||o;e.call(E,a,b,c,d)}function q(){function a(a){b.notificationManager.open({text:a,type:"error"}),b.setProgressState(!1),u()}u()||(b.setProgressState(!0),p("spellcheck",j().text,y,a),b.focus())}function r(){b.dom.select("span.mce-spellchecker-word").length||u()}function s(a,c){b.setProgressState(!0),p("addToDictionary",a,function(){b.setProgressState(!1),b.dom.remove(c,!0),r()},function(a){b.notificationManager.open({text:a,type:"error"}),b.setProgressState(!1)})}function t(a,d,e){b.selection.collapse(),e?c.each(b.dom.select("span.mce-spellchecker-word"),function(c){c.getAttribute("data-mce-word")==a&&b.dom.remove(c,!0)}):b.dom.remove(d,!0),r()}function u(){return j().reset(),E.textMatcher=null,B?(B=!1,b.fire("SpellcheckEnd"),!0):void 0}function v(a){var b=a.getAttribute("data-mce-index");return"number"==typeof b?""+b:b}function w(a){var d,e=[];if(d=c.toArray(b.getBody().getElementsByTagName("span")),d.length)for(var f=0;f<d.length;f++){var g=v(d[f]);null!==g&&g.length&&g===a.toString()&&e.push(d[f])}return e}function x(a){var b=F.spellchecker_language;a.control.items().each(function(a){a.active(a.settings.data===b)})}function y(a){var c;if(a.words?(D=!!a.dictionary,c=a.words):c=a,b.setProgressState(!1),l(c)){var d=b.translate("No misspellings found.");return b.notificationManager.open({text:d,type:"info"}),void(B=!1)}A=c,j().find(n()).filter(function(a){return!!c[a.text]}).wrap(function(a){return b.dom.create("span",{"class":"mce-spellchecker-word","data-mce-bogus":1,"data-mce-word":a.text})}),B=!0,b.fire("SpellcheckStart")}var z,A,B,C,D,E=this,F=b.settings,G=F.spellchecker_languages||"English=en,Danish=da,Dutch=nl,Finnish=fi,French=fr_FR,German=de,Italian=it,Polish=pl,Portuguese=pt_BR,Spanish=es,Swedish=sv";z=k("Language",c.map(G.split(","),function(a){return a=a.split("="),{name:a[0],value:a[1]}})),b.on("click",function(a){var c=a.target;if("mce-spellchecker-word"==c.className){a.preventDefault();var d=w(v(c));if(d.length>0){var e=b.dom.createRng();e.setStartBefore(d[0]),e.setEndAfter(d[d.length-1]),b.selection.setRng(e),m(c.getAttribute("data-mce-word"),d)}}}),b.addMenuItem("spellchecker",{text:"Spellcheck",context:"tools",onclick:q,selectable:!0,onPostRender:function(){var a=this;a.active(B),b.on("SpellcheckStart SpellcheckEnd",function(){a.active(B)})}});var H={tooltip:"Spellcheck",onclick:q,onPostRender:function(){var a=this;b.on("SpellcheckStart SpellcheckEnd",function(){a.active(B)})}};z.length>1&&(H.type="splitbutton",H.menu=z,H.onshow=x,H.onselect=function(a){F.spellchecker_language=a.control.settings.data}),b.addButton("spellchecker",H),b.addCommand("mceSpellCheck",q),b.on("remove",function(){C&&(C.remove(),C=null)}),b.on("change",r),this.getTextMatcher=j,this.getWordCharPattern=n,this.markErrors=y,this.getLanguage=function(){return F.spellchecker_language},F.spellchecker_language=F.spellchecker_language||F.language||"en"})}),f(["tinymce/spellcheckerplugin/DomTextMatcher"])}(this);
