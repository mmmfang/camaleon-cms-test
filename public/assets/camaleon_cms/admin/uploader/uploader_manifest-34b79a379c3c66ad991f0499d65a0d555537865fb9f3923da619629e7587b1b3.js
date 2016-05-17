/*!
 * jQuery Form Plugin
 * version: 3.51.0-2014.06.20
 * Requires jQuery v1.5 or later
 * Copyright (c) 2014 M. Alsup
 * Examples and documentation at: http://malsup.com/jquery/form/
 * Project repository: https://github.com/malsup/form
 * Dual licensed under the MIT and GPL licenses.
 * https://github.com/malsup/form#copyright-and-license
 */
/*global ActiveXObject */

// AMD support
(function (factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // using AMD; register as anon module
        define(['jquery'], factory);
    } else {
        // no AMD; invoke directly
        factory( (typeof(jQuery) != 'undefined') ? jQuery : window.Zepto );
    }
}

(function($) {
    "use strict";

    /*
     Usage Note:
     -----------
     Do not use both ajaxSubmit and ajaxForm on the same form.  These
     functions are mutually exclusive.  Use ajaxSubmit if you want
     to bind your own submit handler to the form.  For example,

     $(document).ready(function() {
     $('#myForm').on('submit', function(e) {
     e.preventDefault(); // <-- important
     $(this).ajaxSubmit({
     target: '#output'
     });
     });
     });

     Use ajaxForm when you want the plugin to manage all the event binding
     for you.  For example,

     $(document).ready(function() {
     $('#myForm').ajaxForm({
     target: '#output'
     });
     });

     You can also use ajaxForm with delegation (requires jQuery v1.7+), so the
     form does not have to exist when you invoke ajaxForm:

     $('#myForm').ajaxForm({
     delegation: true,
     target: '#output'
     });

     When using ajaxForm, the ajaxSubmit function will be invoked for you
     at the appropriate time.
     */

    /**
     * Feature detection
     */
    var feature = {};
    feature.fileapi = $("<input type='file'/>").get(0).files !== undefined;
    feature.formdata = window.FormData !== undefined;

    var hasProp = !!$.fn.prop;

// attr2 uses prop when it can but checks the return type for
// an expected string.  this accounts for the case where a form
// contains inputs with names like "action" or "method"; in those
// cases "prop" returns the element
    $.fn.attr2 = function() {
        if ( ! hasProp ) {
            return this.attr.apply(this, arguments);
        }
        var val = this.prop.apply(this, arguments);
        if ( ( val && val.jquery ) || typeof val === 'string' ) {
            return val;
        }
        return this.attr.apply(this, arguments);
    };

    /**
     * ajaxSubmit() provides a mechanism for immediately submitting
     * an HTML form using AJAX.
     */
    $.fn.ajaxSubmit = function(options) {
        /*jshint scripturl:true */

        // fast fail if nothing selected (http://dev.jquery.com/ticket/2752)
        if (!this.length) {
            log('ajaxSubmit: skipping submit process - no element selected');
            return this;
        }

        var method, action, url, $form = this;

        if (typeof options == 'function') {
            options = { success: options };
        }
        else if ( options === undefined ) {
            options = {};
        }

        method = options.type || this.attr2('method');
        action = options.url  || this.attr2('action');

        url = (typeof action === 'string') ? $.trim(action) : '';
        url = url || window.location.href || '';
        if (url) {
            // clean url (don't include hash vaue)
            url = (url.match(/^([^#]+)/)||[])[1];
        }

        options = $.extend(true, {
            url:  url,
            success: $.ajaxSettings.success,
            type: method || $.ajaxSettings.type,
            iframeSrc: /^https/i.test(window.location.href || '') ? 'javascript:false' : 'about:blank'
        }, options);

        // hook for manipulating the form data before it is extracted;
        // convenient for use with rich editors like tinyMCE or FCKEditor
        var veto = {};
        this.trigger('form-pre-serialize', [this, options, veto]);
        if (veto.veto) {
            log('ajaxSubmit: submit vetoed via form-pre-serialize trigger');
            return this;
        }

        // provide opportunity to alter form data before it is serialized
        if (options.beforeSerialize && options.beforeSerialize(this, options) === false) {
            log('ajaxSubmit: submit aborted via beforeSerialize callback');
            return this;
        }

        var traditional = options.traditional;
        if ( traditional === undefined ) {
            traditional = $.ajaxSettings.traditional;
        }

        var elements = [];
        var qx, a = this.formToArray(options.semantic, elements);
        if (options.data) {
            options.extraData = options.data;
            qx = $.param(options.data, traditional);
        }

        // give pre-submit callback an opportunity to abort the submit
        if (options.beforeSubmit && options.beforeSubmit(a, this, options) === false) {
            log('ajaxSubmit: submit aborted via beforeSubmit callback');
            return this;
        }

        // fire vetoable 'validate' event
        this.trigger('form-submit-validate', [a, this, options, veto]);
        if (veto.veto) {
            log('ajaxSubmit: submit vetoed via form-submit-validate trigger');
            return this;
        }

        var q = $.param(a, traditional);
        if (qx) {
            q = ( q ? (q + '&' + qx) : qx );
        }
        if (options.type.toUpperCase() == 'GET') {
            options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + q;
            options.data = null;  // data is null for 'get'
        }
        else {
            options.data = q; // data is the query string for 'post'
        }

        var callbacks = [];
        if (options.resetForm) {
            callbacks.push(function() { $form.resetForm(); });
        }
        if (options.clearForm) {
            callbacks.push(function() { $form.clearForm(options.includeHidden); });
        }

        // perform a load on the target only if dataType is not provided
        if (!options.dataType && options.target) {
            var oldSuccess = options.success || function(){};
            callbacks.push(function(data) {
                var fn = options.replaceTarget ? 'replaceWith' : 'html';
                $(options.target)[fn](data).each(oldSuccess, arguments);
            });
        }
        else if (options.success) {
            callbacks.push(options.success);
        }

        options.success = function(data, status, xhr) { // jQuery 1.4+ passes xhr as 3rd arg
            var context = options.context || this ;    // jQuery 1.4+ supports scope context
            for (var i=0, max=callbacks.length; i < max; i++) {
                callbacks[i].apply(context, [data, status, xhr || $form, $form]);
            }
        };

        if (options.error) {
            var oldError = options.error;
            options.error = function(xhr, status, error) {
                var context = options.context || this;
                oldError.apply(context, [xhr, status, error, $form]);
            };
        }

        if (options.complete) {
            var oldComplete = options.complete;
            options.complete = function(xhr, status) {
                var context = options.context || this;
                oldComplete.apply(context, [xhr, status, $form]);
            };
        }

        // are there files to upload?

        // [value] (issue #113), also see comment:
        // https://github.com/malsup/form/commit/588306aedba1de01388032d5f42a60159eea9228#commitcomment-2180219
        var fileInputs = $('input[type=file]:enabled', this).filter(function() { return $(this).val() !== ''; });

        var hasFileInputs = fileInputs.length > 0;
        var mp = 'multipart/form-data';
        var multipart = ($form.attr('enctype') == mp || $form.attr('encoding') == mp);

        var fileAPI = feature.fileapi && feature.formdata;
        log("fileAPI :" + fileAPI);
        var shouldUseFrame = (hasFileInputs || multipart) && !fileAPI;

        var jqxhr;

        // options.iframe allows user to force iframe mode
        // 06-NOV-09: now defaulting to iframe mode if file input is detected
        if (options.iframe !== false && (options.iframe || shouldUseFrame)) {
            // hack to fix Safari hang (thanks to Tim Molendijk for this)
            // see:  http://groups.google.com/group/jquery-dev/browse_thread/thread/36395b7ab510dd5d
            if (options.closeKeepAlive) {
                $.get(options.closeKeepAlive, function() {
                    jqxhr = fileUploadIframe(a);
                });
            }
            else {
                jqxhr = fileUploadIframe(a);
            }
        }
        else if ((hasFileInputs || multipart) && fileAPI) {
            jqxhr = fileUploadXhr(a);
        }
        else {
            jqxhr = $.ajax(options);
        }

        $form.removeData('jqxhr').data('jqxhr', jqxhr);

        // clear element array
        for (var k=0; k < elements.length; k++) {
            elements[k] = null;
        }

        // fire 'notify' event
        this.trigger('form-submit-notify', [this, options]);
        return this;

        // utility fn for deep serialization
        function deepSerialize(extraData){
            var serialized = $.param(extraData, options.traditional).split('&');
            var len = serialized.length;
            var result = [];
            var i, part;
            for (i=0; i < len; i++) {
                // #252; undo param space replacement
                serialized[i] = serialized[i].replace(/\+/g,' ');
                part = serialized[i].split('=');
                // #278; use array instead of object storage, favoring array serializations
                result.push([decodeURIComponent(part[0]), decodeURIComponent(part[1])]);
            }
            return result;
        }

        // XMLHttpRequest Level 2 file uploads (big hat tip to francois2metz)
        function fileUploadXhr(a) {
            var formdata = new FormData();

            for (var i=0; i < a.length; i++) {
                formdata.append(a[i].name, a[i].value);
            }

            if (options.extraData) {
                var serializedData = deepSerialize(options.extraData);
                for (i=0; i < serializedData.length; i++) {
                    if (serializedData[i]) {
                        formdata.append(serializedData[i][0], serializedData[i][1]);
                    }
                }
            }

            options.data = null;

            var s = $.extend(true, {}, $.ajaxSettings, options, {
                contentType: false,
                processData: false,
                cache: false,
                type: method || 'POST'
            });

            if (options.uploadProgress) {
                // workaround because jqXHR does not expose upload property
                s.xhr = function() {
                    var xhr = $.ajaxSettings.xhr();
                    if (xhr.upload) {
                        xhr.upload.addEventListener('progress', function(event) {
                            var percent = 0;
                            var position = event.loaded || event.position; /*event.position is deprecated*/
                            var total = event.total;
                            if (event.lengthComputable) {
                                percent = Math.ceil(position / total * 100);
                            }
                            options.uploadProgress(event, position, total, percent);
                        }, false);
                    }
                    return xhr;
                };
            }

            s.data = null;
            var beforeSend = s.beforeSend;
            s.beforeSend = function(xhr, o) {
                //Send FormData() provided by user
                if (options.formData) {
                    o.data = options.formData;
                }
                else {
                    o.data = formdata;
                }
                if(beforeSend) {
                    beforeSend.call(this, xhr, o);
                }
            };
            return $.ajax(s);
        }

        // private function for handling file uploads (hat tip to YAHOO!)
        function fileUploadIframe(a) {
            var form = $form[0], el, i, s, g, id, $io, io, xhr, sub, n, timedOut, timeoutHandle;
            var deferred = $.Deferred();

            // #341
            deferred.abort = function(status) {
                xhr.abort(status);
            };

            if (a) {
                // ensure that every serialized input is still enabled
                for (i=0; i < elements.length; i++) {
                    el = $(elements[i]);
                    if ( hasProp ) {
                        el.prop('disabled', false);
                    }
                    else {
                        el.removeAttr('disabled');
                    }
                }
            }

            s = $.extend(true, {}, $.ajaxSettings, options);
            s.context = s.context || s;
            id = 'jqFormIO' + (new Date().getTime());
            if (s.iframeTarget) {
                $io = $(s.iframeTarget);
                n = $io.attr2('name');
                if (!n) {
                    $io.attr2('name', id);
                }
                else {
                    id = n;
                }
            }
            else {
                $io = $('<iframe name="' + id + '" src="'+ s.iframeSrc +'" />');
                $io.css({ position: 'absolute', top: '-1000px', left: '-1000px' });
            }
            io = $io[0];


            xhr = { // mock object
                aborted: 0,
                responseText: null,
                responseXML: null,
                status: 0,
                statusText: 'n/a',
                getAllResponseHeaders: function() {},
                getResponseHeader: function() {},
                setRequestHeader: function() {},
                abort: function(status) {
                    var e = (status === 'timeout' ? 'timeout' : 'aborted');
                    log('aborting upload... ' + e);
                    this.aborted = 1;

                    try { // #214, #257
                        if (io.contentWindow.document.execCommand) {
                            io.contentWindow.document.execCommand('Stop');
                        }
                    }
                    catch(ignore) {}

                    $io.attr('src', s.iframeSrc); // abort op in progress
                    xhr.error = e;
                    if (s.error) {
                        s.error.call(s.context, xhr, e, status);
                    }
                    if (g) {
                        $.event.trigger("ajaxError", [xhr, s, e]);
                    }
                    if (s.complete) {
                        s.complete.call(s.context, xhr, e);
                    }
                }
            };

            g = s.global;
            // trigger ajax global events so that activity/block indicators work like normal
            if (g && 0 === $.active++) {
                $.event.trigger("ajaxStart");
            }
            if (g) {
                $.event.trigger("ajaxSend", [xhr, s]);
            }

            if (s.beforeSend && s.beforeSend.call(s.context, xhr, s) === false) {
                if (s.global) {
                    $.active--;
                }
                deferred.reject();
                return deferred;
            }
            if (xhr.aborted) {
                deferred.reject();
                return deferred;
            }

            // add submitting element to data if we know it
            sub = form.clk;
            if (sub) {
                n = sub.name;
                if (n && !sub.disabled) {
                    s.extraData = s.extraData || {};
                    s.extraData[n] = sub.value;
                    if (sub.type == "image") {
                        s.extraData[n+'.x'] = form.clk_x;
                        s.extraData[n+'.y'] = form.clk_y;
                    }
                }
            }

            var CLIENT_TIMEOUT_ABORT = 1;
            var SERVER_ABORT = 2;

            function getDoc(frame) {
                /* it looks like contentWindow or contentDocument do not
                 * carry the protocol property in ie8, when running under ssl
                 * frame.document is the only valid response document, since
                 * the protocol is know but not on the other two objects. strange?
                 * "Same origin policy" http://en.wikipedia.org/wiki/Same_origin_policy
                 */

                var doc = null;

                // IE8 cascading access check
                try {
                    if (frame.contentWindow) {
                        doc = frame.contentWindow.document;
                    }
                } catch(err) {
                    // IE8 access denied under ssl & missing protocol
                    log('cannot get iframe.contentWindow document: ' + err);
                }

                if (doc) { // successful getting content
                    return doc;
                }

                try { // simply checking may throw in ie8 under ssl or mismatched protocol
                    doc = frame.contentDocument ? frame.contentDocument : frame.document;
                } catch(err) {
                    // last attempt
                    log('cannot get iframe.contentDocument: ' + err);
                    doc = frame.document;
                }
                return doc;
            }

            // Rails CSRF hack (thanks to Yvan Barthelemy)
            var csrf_token = $('meta[name=csrf-token]').attr('content');
            var csrf_param = $('meta[name=csrf-param]').attr('content');
            if (csrf_param && csrf_token) {
                s.extraData = s.extraData || {};
                s.extraData[csrf_param] = csrf_token;
            }

            // take a breath so that pending repaints get some cpu time before the upload starts
            function doSubmit() {
                // make sure form attrs are set
                var t = $form.attr2('target'),
                    a = $form.attr2('action'),
                    mp = 'multipart/form-data',
                    et = $form.attr('enctype') || $form.attr('encoding') || mp;

                // update form attrs in IE friendly way
                form.setAttribute('target',id);
                if (!method || /post/i.test(method) ) {
                    form.setAttribute('method', 'POST');
                }
                if (a != s.url) {
                    form.setAttribute('action', s.url);
                }

                // ie borks in some cases when setting encoding
                if (! s.skipEncodingOverride && (!method || /post/i.test(method))) {
                    $form.attr({
                        encoding: 'multipart/form-data',
                        enctype:  'multipart/form-data'
                    });
                }

                // support timout
                if (s.timeout) {
                    timeoutHandle = setTimeout(function() { timedOut = true; cb(CLIENT_TIMEOUT_ABORT); }, s.timeout);
                }

                // look for server aborts
                function checkState() {
                    try {
                        var state = getDoc(io).readyState;
                        log('state = ' + state);
                        if (state && state.toLowerCase() == 'uninitialized') {
                            setTimeout(checkState,50);
                        }
                    }
                    catch(e) {
                        log('Server abort: ' , e, ' (', e.name, ')');
                        cb(SERVER_ABORT);
                        if (timeoutHandle) {
                            clearTimeout(timeoutHandle);
                        }
                        timeoutHandle = undefined;
                    }
                }

                // add "extra" data to form if provided in options
                var extraInputs = [];
                try {
                    if (s.extraData) {
                        for (var n in s.extraData) {
                            if (s.extraData.hasOwnProperty(n)) {
                                // if using the $.param format that allows for multiple values with the same name
                                if($.isPlainObject(s.extraData[n]) && s.extraData[n].hasOwnProperty('name') && s.extraData[n].hasOwnProperty('value')) {
                                    extraInputs.push(
                                        $('<input type="hidden" name="'+s.extraData[n].name+'">').val(s.extraData[n].value)
                                            .appendTo(form)[0]);
                                } else {
                                    extraInputs.push(
                                        $('<input type="hidden" name="'+n+'">').val(s.extraData[n])
                                            .appendTo(form)[0]);
                                }
                            }
                        }
                    }

                    if (!s.iframeTarget) {
                        // add iframe to doc and submit the form
                        $io.appendTo('body');
                    }
                    if (io.attachEvent) {
                        io.attachEvent('onload', cb);
                    }
                    else {
                        io.addEventListener('load', cb, false);
                    }
                    setTimeout(checkState,15);

                    try {
                        form.submit();
                    } catch(err) {
                        // just in case form has element with name/id of 'submit'
                        var submitFn = document.createElement('form').submit;
                        submitFn.apply(form);
                    }
                }
                finally {
                    // reset attrs and remove "extra" input elements
                    form.setAttribute('action',a);
                    form.setAttribute('enctype', et); // #380
                    if(t) {
                        form.setAttribute('target', t);
                    } else {
                        $form.removeAttr('target');
                    }
                    $(extraInputs).remove();
                }
            }

            if (s.forceSync) {
                doSubmit();
            }
            else {
                setTimeout(doSubmit, 10); // this lets dom updates render
            }

            var data, doc, domCheckCount = 50, callbackProcessed;

            function cb(e) {
                if (xhr.aborted || callbackProcessed) {
                    return;
                }

                doc = getDoc(io);
                if(!doc) {
                    log('cannot access response document');
                    e = SERVER_ABORT;
                }
                if (e === CLIENT_TIMEOUT_ABORT && xhr) {
                    xhr.abort('timeout');
                    deferred.reject(xhr, 'timeout');
                    return;
                }
                else if (e == SERVER_ABORT && xhr) {
                    xhr.abort('server abort');
                    deferred.reject(xhr, 'error', 'server abort');
                    return;
                }

                if (!doc || doc.location.href == s.iframeSrc) {
                    // response not received yet
                    if (!timedOut) {
                        return;
                    }
                }
                if (io.detachEvent) {
                    io.detachEvent('onload', cb);
                }
                else {
                    io.removeEventListener('load', cb, false);
                }

                var status = 'success', errMsg;
                try {
                    if (timedOut) {
                        throw 'timeout';
                    }

                    var isXml = s.dataType == 'xml' || doc.XMLDocument || $.isXMLDoc(doc);
                    log('isXml='+isXml);
                    if (!isXml && window.opera && (doc.body === null || !doc.body.innerHTML)) {
                        if (--domCheckCount) {
                            // in some browsers (Opera) the iframe DOM is not always traversable when
                            // the onload callback fires, so we loop a bit to accommodate
                            log('requeing onLoad callback, DOM not available');
                            setTimeout(cb, 250);
                            return;
                        }
                        // let this fall through because server response could be an empty document
                        //log('Could not access iframe DOM after mutiple tries.');
                        //throw 'DOMException: not available';
                    }

                    //log('response detected');
                    var docRoot = doc.body ? doc.body : doc.documentElement;
                    xhr.responseText = docRoot ? docRoot.innerHTML : null;
                    xhr.responseXML = doc.XMLDocument ? doc.XMLDocument : doc;
                    if (isXml) {
                        s.dataType = 'xml';
                    }
                    xhr.getResponseHeader = function(header){
                        var headers = {'content-type': s.dataType};
                        return headers[header.toLowerCase()];
                    };
                    // support for XHR 'status' & 'statusText' emulation :
                    if (docRoot) {
                        xhr.status = Number( docRoot.getAttribute('status') ) || xhr.status;
                        xhr.statusText = docRoot.getAttribute('statusText') || xhr.statusText;
                    }

                    var dt = (s.dataType || '').toLowerCase();
                    var scr = /(json|script|text)/.test(dt);
                    if (scr || s.textarea) {
                        // see if user embedded response in textarea
                        var ta = doc.getElementsByTagName('textarea')[0];
                        if (ta) {
                            xhr.responseText = ta.value;
                            // support for XHR 'status' & 'statusText' emulation :
                            xhr.status = Number( ta.getAttribute('status') ) || xhr.status;
                            xhr.statusText = ta.getAttribute('statusText') || xhr.statusText;
                        }
                        else if (scr) {
                            // account for browsers injecting pre around json response
                            var pre = doc.getElementsByTagName('pre')[0];
                            var b = doc.getElementsByTagName('body')[0];
                            if (pre) {
                                xhr.responseText = pre.textContent ? pre.textContent : pre.innerText;
                            }
                            else if (b) {
                                xhr.responseText = b.textContent ? b.textContent : b.innerText;
                            }
                        }
                    }
                    else if (dt == 'xml' && !xhr.responseXML && xhr.responseText) {
                        xhr.responseXML = toXml(xhr.responseText);
                    }

                    try {
                        data = httpData(xhr, dt, s);
                    }
                    catch (err) {
                        status = 'parsererror';
                        xhr.error = errMsg = (err || status);
                    }
                }
                catch (err) {
                    log('error caught: ',err);
                    status = 'error';
                    xhr.error = errMsg = (err || status);
                }

                if (xhr.aborted) {
                    log('upload aborted');
                    status = null;
                }

                if (xhr.status) { // we've set xhr.status
                    status = (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) ? 'success' : 'error';
                }

                // ordering of these callbacks/triggers is odd, but that's how $.ajax does it
                if (status === 'success') {
                    if (s.success) {
                        s.success.call(s.context, data, 'success', xhr);
                    }
                    deferred.resolve(xhr.responseText, 'success', xhr);
                    if (g) {
                        $.event.trigger("ajaxSuccess", [xhr, s]);
                    }
                }
                else if (status) {
                    if (errMsg === undefined) {
                        errMsg = xhr.statusText;
                    }
                    if (s.error) {
                        s.error.call(s.context, xhr, status, errMsg);
                    }
                    deferred.reject(xhr, 'error', errMsg);
                    if (g) {
                        $.event.trigger("ajaxError", [xhr, s, errMsg]);
                    }
                }

                if (g) {
                    $.event.trigger("ajaxComplete", [xhr, s]);
                }

                if (g && ! --$.active) {
                    $.event.trigger("ajaxStop");
                }

                if (s.complete) {
                    s.complete.call(s.context, xhr, status);
                }

                callbackProcessed = true;
                if (s.timeout) {
                    clearTimeout(timeoutHandle);
                }

                // clean up
                setTimeout(function() {
                    if (!s.iframeTarget) {
                        $io.remove();
                    }
                    else { //adding else to clean up existing iframe response.
                        $io.attr('src', s.iframeSrc);
                    }
                    xhr.responseXML = null;
                }, 100);
            }

            var toXml = $.parseXML || function(s, doc) { // use parseXML if available (jQuery 1.5+)
                    if (window.ActiveXObject) {
                        doc = new ActiveXObject('Microsoft.XMLDOM');
                        doc.async = 'false';
                        doc.loadXML(s);
                    }
                    else {
                        doc = (new DOMParser()).parseFromString(s, 'text/xml');
                    }
                    return (doc && doc.documentElement && doc.documentElement.nodeName != 'parsererror') ? doc : null;
                };
            var parseJSON = $.parseJSON || function(s) {
                    /*jslint evil:true */
                    return window['eval']('(' + s + ')');
                };

            var httpData = function( xhr, type, s ) { // mostly lifted from jq1.4.4

                var ct = xhr.getResponseHeader('content-type') || '',
                    xml = type === 'xml' || !type && ct.indexOf('xml') >= 0,
                    data = xml ? xhr.responseXML : xhr.responseText;

                if (xml && data.documentElement.nodeName === 'parsererror') {
                    if ($.error) {
                        $.error('parsererror');
                    }
                }
                if (s && s.dataFilter) {
                    data = s.dataFilter(data, type);
                }
                if (typeof data === 'string') {
                    if (type === 'json' || !type && ct.indexOf('json') >= 0) {
                        data = parseJSON(data);
                    } else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
                        $.globalEval(data);
                    }
                }
                return data;
            };

            return deferred;
        }
    };

    /**
     * ajaxForm() provides a mechanism for fully automating form submission.
     *
     * The advantages of using this method instead of ajaxSubmit() are:
     *
     * 1: This method will include coordinates for <input type="image" /> elements (if the element
     *    is used to submit the form).
     * 2. This method will include the submit element's name/value data (for the element that was
     *    used to submit the form).
     * 3. This method binds the submit() method to the form for you.
     *
     * The options argument for ajaxForm works exactly as it does for ajaxSubmit.  ajaxForm merely
     * passes the options argument along after properly binding events for submit elements and
     * the form itself.
     */
    $.fn.ajaxForm = function(options) {
        options = options || {};
        options.delegation = options.delegation && $.isFunction($.fn.on);

        // in jQuery 1.3+ we can fix mistakes with the ready state
        if (!options.delegation && this.length === 0) {
            var o = { s: this.selector, c: this.context };
            if (!$.isReady && o.s) {
                log('DOM not ready, queuing ajaxForm');
                $(function() {
                    $(o.s,o.c).ajaxForm(options);
                });
                return this;
            }
            // is your DOM ready?  http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
            log('terminating; zero elements found by selector' + ($.isReady ? '' : ' (DOM not ready)'));
            return this;
        }

        if ( options.delegation ) {
            $(document)
                .off('submit.form-plugin', this.selector, doAjaxSubmit)
                .off('click.form-plugin', this.selector, captureSubmittingElement)
                .on('submit.form-plugin', this.selector, options, doAjaxSubmit)
                .on('click.form-plugin', this.selector, options, captureSubmittingElement);
            return this;
        }

        return this.ajaxFormUnbind()
            .bind('submit.form-plugin', options, doAjaxSubmit)
            .bind('click.form-plugin', options, captureSubmittingElement);
    };

// private event handlers
    function doAjaxSubmit(e) {
        /*jshint validthis:true */
        var options = e.data;
        if (!e.isDefaultPrevented()) { // if event has been canceled, don't proceed
            e.preventDefault();
            $(e.target).ajaxSubmit(options); // #365
        }
    }

    function captureSubmittingElement(e) {
        /*jshint validthis:true */
        var target = e.target;
        var $el = $(target);
        if (!($el.is("[type=submit],[type=image]"))) {
            // is this a child element of the submit el?  (ex: a span within a button)
            var t = $el.closest('[type=submit]');
            if (t.length === 0) {
                return;
            }
            target = t[0];
        }
        var form = this;
        form.clk = target;
        if (target.type == 'image') {
            if (e.offsetX !== undefined) {
                form.clk_x = e.offsetX;
                form.clk_y = e.offsetY;
            } else if (typeof $.fn.offset == 'function') {
                var offset = $el.offset();
                form.clk_x = e.pageX - offset.left;
                form.clk_y = e.pageY - offset.top;
            } else {
                form.clk_x = e.pageX - target.offsetLeft;
                form.clk_y = e.pageY - target.offsetTop;
            }
        }
        // clear form vars
        setTimeout(function() { form.clk = form.clk_x = form.clk_y = null; }, 100);
    }


// ajaxFormUnbind unbinds the event handlers that were bound by ajaxForm
    $.fn.ajaxFormUnbind = function() {
        return this.unbind('submit.form-plugin click.form-plugin');
    };

    /**
     * formToArray() gathers form element data into an array of objects that can
     * be passed to any of the following ajax functions: $.get, $.post, or load.
     * Each object in the array has both a 'name' and 'value' property.  An example of
     * an array for a simple login form might be:
     *
     * [ { name: 'username', value: 'jresig' }, { name: 'password', value: 'secret' } ]
     *
     * It is this array that is passed to pre-submit callback functions provided to the
     * ajaxSubmit() and ajaxForm() methods.
     */
    $.fn.formToArray = function(semantic, elements) {
        var a = [];
        if (this.length === 0) {
            return a;
        }

        var form = this[0];
        var formId = this.attr('id');
        var els = semantic ? form.getElementsByTagName('*') : form.elements;
        var els2;

        if (els && !/MSIE [678]/.test(navigator.userAgent)) { // #390
            els = $(els).get();  // convert to standard array
        }

        // #386; account for inputs outside the form which use the 'form' attribute
        if ( formId ) {
            els2 = $(':input[form="' + formId + '"]').get(); // hat tip @thet
            if ( els2.length ) {
                els = (els || []).concat(els2);
            }
        }

        if (!els || !els.length) {
            return a;
        }

        var i,j,n,v,el,max,jmax;
        for(i=0, max=els.length; i < max; i++) {
            el = els[i];
            n = el.name;
            if (!n || el.disabled) {
                continue;
            }

            if (semantic && form.clk && el.type == "image") {
                // handle image inputs on the fly when semantic == true
                if(form.clk == el) {
                    a.push({name: n, value: $(el).val(), type: el.type });
                    a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
                }
                continue;
            }

            v = $.fieldValue(el, true);
            if (v && v.constructor == Array) {
                if (elements) {
                    elements.push(el);
                }
                for(j=0, jmax=v.length; j < jmax; j++) {
                    a.push({name: n, value: v[j]});
                }
            }
            else if (feature.fileapi && el.type == 'file') {
                if (elements) {
                    elements.push(el);
                }
                var files = el.files;
                if (files.length) {
                    for (j=0; j < files.length; j++) {
                        a.push({name: n, value: files[j], type: el.type});
                    }
                }
                else {
                    // #180
                    a.push({ name: n, value: '', type: el.type });
                }
            }
            else if (v !== null && typeof v != 'undefined') {
                if (elements) {
                    elements.push(el);
                }
                a.push({name: n, value: v, type: el.type, required: el.required});
            }
        }

        if (!semantic && form.clk) {
            // input type=='image' are not found in elements array! handle it here
            var $input = $(form.clk), input = $input[0];
            n = input.name;
            if (n && !input.disabled && input.type == 'image') {
                a.push({name: n, value: $input.val()});
                a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
            }
        }
        return a;
    };

    /**
     * Serializes form data into a 'submittable' string. This method will return a string
     * in the format: name1=value1&amp;name2=value2
     */
    $.fn.formSerialize = function(semantic) {
        //hand off to jQuery.param for proper encoding
        return $.param(this.formToArray(semantic));
    };

    /**
     * Serializes all field elements in the jQuery object into a query string.
     * This method will return a string in the format: name1=value1&amp;name2=value2
     */
    $.fn.fieldSerialize = function(successful) {
        var a = [];
        this.each(function() {
            var n = this.name;
            if (!n) {
                return;
            }
            var v = $.fieldValue(this, successful);
            if (v && v.constructor == Array) {
                for (var i=0,max=v.length; i < max; i++) {
                    a.push({name: n, value: v[i]});
                }
            }
            else if (v !== null && typeof v != 'undefined') {
                a.push({name: this.name, value: v});
            }
        });
        //hand off to jQuery.param for proper encoding
        return $.param(a);
    };

    /**
     * Returns the value(s) of the element in the matched set.  For example, consider the following form:
     *
     *  <form><fieldset>
     *      <input name="A" type="text" />
     *      <input name="A" type="text" />
     *      <input name="B" type="checkbox" value="B1" />
     *      <input name="B" type="checkbox" value="B2"/>
     *      <input name="C" type="radio" value="C1" />
     *      <input name="C" type="radio" value="C2" />
     *  </fieldset></form>
     *
     *  var v = $('input[type=text]').fieldValue();
     *  // if no values are entered into the text inputs
     *  v == ['','']
     *  // if values entered into the text inputs are 'foo' and 'bar'
     *  v == ['foo','bar']
     *
     *  var v = $('input[type=checkbox]').fieldValue();
     *  // if neither checkbox is checked
     *  v === undefined
     *  // if both checkboxes are checked
     *  v == ['B1', 'B2']
     *
     *  var v = $('input[type=radio]').fieldValue();
     *  // if neither radio is checked
     *  v === undefined
     *  // if first radio is checked
     *  v == ['C1']
     *
     * The successful argument controls whether or not the field element must be 'successful'
     * (per http://www.w3.org/TR/html4/interact/forms.html#successful-controls).
     * The default value of the successful argument is true.  If this value is false the value(s)
     * for each element is returned.
     *
     * Note: This method *always* returns an array.  If no valid value can be determined the
     *    array will be empty, otherwise it will contain one or more values.
     */
    $.fn.fieldValue = function(successful) {
        for (var val=[], i=0, max=this.length; i < max; i++) {
            var el = this[i];
            var v = $.fieldValue(el, successful);
            if (v === null || typeof v == 'undefined' || (v.constructor == Array && !v.length)) {
                continue;
            }
            if (v.constructor == Array) {
                $.merge(val, v);
            }
            else {
                val.push(v);
            }
        }
        return val;
    };

    /**
     * Returns the value of the field element.
     */
    $.fieldValue = function(el, successful) {
        var n = el.name, t = el.type, tag = el.tagName.toLowerCase();
        if (successful === undefined) {
            successful = true;
        }

        if (successful && (!n || el.disabled || t == 'reset' || t == 'button' ||
            (t == 'checkbox' || t == 'radio') && !el.checked ||
            (t == 'submit' || t == 'image') && el.form && el.form.clk != el ||
            tag == 'select' && el.selectedIndex == -1)) {
            return null;
        }

        if (tag == 'select') {
            var index = el.selectedIndex;
            if (index < 0) {
                return null;
            }
            var a = [], ops = el.options;
            var one = (t == 'select-one');
            var max = (one ? index+1 : ops.length);
            for(var i=(one ? index : 0); i < max; i++) {
                var op = ops[i];
                if (op.selected) {
                    var v = op.value;
                    if (!v) { // extra pain for IE...
                        v = (op.attributes && op.attributes.value && !(op.attributes.value.specified)) ? op.text : op.value;
                    }
                    if (one) {
                        return v;
                    }
                    a.push(v);
                }
            }
            return a;
        }
        return $(el).val();
    };

    /**
     * Clears the form data.  Takes the following actions on the form's input fields:
     *  - input text fields will have their 'value' property set to the empty string
     *  - select elements will have their 'selectedIndex' property set to -1
     *  - checkbox and radio inputs will have their 'checked' property set to false
     *  - inputs of type submit, button, reset, and hidden will *not* be effected
     *  - button elements will *not* be effected
     */
    $.fn.clearForm = function(includeHidden) {
        return this.each(function() {
            $('input,select,textarea', this).clearFields(includeHidden);
        });
    };

    /**
     * Clears the selected form elements.
     */
    $.fn.clearFields = $.fn.clearInputs = function(includeHidden) {
        var re = /^(?:color|date|datetime|email|month|number|password|range|search|tel|text|time|url|week)$/i; // 'hidden' is not in this list
        return this.each(function() {
            var t = this.type, tag = this.tagName.toLowerCase();
            if (re.test(t) || tag == 'textarea') {
                this.value = '';
            }
            else if (t == 'checkbox' || t == 'radio') {
                this.checked = false;
            }
            else if (tag == 'select') {
                this.selectedIndex = -1;
            }
            else if (t == "file") {
                if (/MSIE/.test(navigator.userAgent)) {
                    $(this).replaceWith($(this).clone(true));
                } else {
                    $(this).val('');
                }
            }
            else if (includeHidden) {
                // includeHidden can be the value true, or it can be a selector string
                // indicating a special test; for example:
                //  $('#myForm').clearForm('.special:hidden')
                // the above would clean hidden inputs that have the class of 'special'
                if ( (includeHidden === true && /hidden/.test(t)) ||
                    (typeof includeHidden == 'string' && $(this).is(includeHidden)) ) {
                    this.value = '';
                }
            }
        });
    };

    /**
     * Resets the form data.  Causes all form elements to be reset to their original value.
     */
    $.fn.resetForm = function() {
        return this.each(function() {
            // guard against an input with the name of 'reset'
            // note that IE reports the reset function as an 'object'
            if (typeof this.reset == 'function' || (typeof this.reset == 'object' && !this.reset.nodeType)) {
                this.reset();
            }
        });
    };

    /**
     * Enables or disables any matching elements.
     */
    $.fn.enable = function(b) {
        if (b === undefined) {
            b = true;
        }
        return this.each(function() {
            this.disabled = !b;
        });
    };

    /**
     * Checks/unchecks any matching checkboxes or radio buttons and
     * selects/deselects and matching option elements.
     */
    $.fn.selected = function(select) {
        if (select === undefined) {
            select = true;
        }
        return this.each(function() {
            var t = this.type;
            if (t == 'checkbox' || t == 'radio') {
                this.checked = select;
            }
            else if (this.tagName.toLowerCase() == 'option') {
                var $sel = $(this).parent('select');
                if (select && $sel[0] && $sel[0].type == 'select-one') {
                    // deselect all other options
                    $sel.find('option').selected(false);
                }
                this.selected = select;
            }
        });
    };

// expose debug var
    $.fn.ajaxSubmit.debug = false;

// helper fn for console logging
    function log() {
        if (!$.fn.ajaxSubmit.debug) {
            return;
        }
        var msg = '[jquery.form] ' + Array.prototype.join.call(arguments,'');
        if (window.console && window.console.log) {
            window.console.log(msg);
        }
        else if (window.opera && window.opera.postError) {
            window.opera.postError(msg);
        }
    }

}));
/*!
 * jQuery Upload File Plugin
 * version: 4.0.8
 * @requires jQuery v1.5 or later & form plugin
 * Copyright (c) 2013 Ravishanker Kusuma
 * http://hayageek.com/
 */

!function(e){void 0==jQuery.fn.ajaxForm&&e.getScript(("https:"==document.location.protocol?"https://":"http://")+"malsup.github.io/jquery.form.js");var a={};a.fileapi=void 0!==e("<input type='file'/>").get(0).files,a.formdata=void 0!==window.FormData,e.fn.uploadFile=function(t){function r(){S||(S=!0,function e(){if(w.sequential||(w.sequentialCount=99999),0==x.length&&0==D.length)w.afterUploadAll&&w.afterUploadAll(C),S=!1;else{if(D.length<w.sequentialCount){var a=x.shift();void 0!=a&&(D.push(a),a.submit())}window.setTimeout(e,100)}}())}function o(a,t,r){r.on("dragenter",function(a){a.stopPropagation(),a.preventDefault(),e(this).addClass(t.dragDropHoverClass)}),r.on("dragover",function(a){a.stopPropagation(),a.preventDefault();var r=e(this);r.hasClass(t.dragDropContainerClass)&&!r.hasClass(t.dragDropHoverClass)&&r.addClass(t.dragDropHoverClass)}),r.on("drop",function(r){r.preventDefault(),e(this).removeClass(t.dragDropHoverClass),a.errorLog.html("");var o=r.originalEvent.dataTransfer.files;return!t.multiple&&o.length>1?void(t.showError&&e("<div class='"+t.errorClass+"'>"+t.multiDragErrorStr+"</div>").appendTo(a.errorLog)):void(0!=t.onSelect(o)&&l(t,a,o))}),r.on("dragleave",function(){e(this).removeClass(t.dragDropHoverClass)}),e(document).on("dragenter",function(e){e.stopPropagation(),e.preventDefault()}),e(document).on("dragover",function(a){a.stopPropagation(),a.preventDefault();var r=e(this);r.hasClass(t.dragDropContainerClass)||r.removeClass(t.dragDropHoverClass)}),e(document).on("drop",function(a){a.stopPropagation(),a.preventDefault(),e(this).removeClass(t.dragDropHoverClass)})}function s(e){var a="",t=e/1024;if(parseInt(t)>1024){var r=t/1024;a=r.toFixed(2)+" MB"}else a=t.toFixed(2)+" KB";return a}function i(a){var t=[];t="string"==jQuery.type(a)?a.split("&"):e.param(a).split("&");var r,o,s=t.length,i=[];for(r=0;s>r;r++)t[r]=t[r].replace(/\+/g," "),o=t[r].split("="),i.push([decodeURIComponent(o[0]),decodeURIComponent(o[1])]);return i}function l(a,t,r){for(var o=0;o<r.length;o++)if(n(t,a,r[o].name))if(a.allowDuplicates||!d(t,r[o].name))if(-1!=a.maxFileSize&&r[o].size>a.maxFileSize)a.showError&&e("<div class='"+a.errorClass+"'><b>"+r[o].name+"</b> "+a.sizeErrorStr+s(a.maxFileSize)+"</div>").appendTo(t.errorLog);else if(-1!=a.maxFileCount&&t.selectedFiles>=a.maxFileCount)a.showError&&e("<div class='"+a.errorClass+"'><b>"+r[o].name+"</b> "+a.maxFileCountErrorStr+a.maxFileCount+"</div>").appendTo(t.errorLog);else{t.selectedFiles++,t.existingFileNames.push(r[o].name);var l=a,p=new FormData,u=a.fileName.replace("[]","");p.append(u,r[o]);var c=a.formData;if(c)for(var h=i(c),f=0;f<h.length;f++)h[f]&&p.append(h[f][0],h[f][1]);l.fileData=p;var w=new m(t,a),g="";g=a.showFileCounter?t.fileCounter+a.fileCounterStyle+r[o].name:r[o].name,a.showFileSize&&(g+=" ("+s(r[o].size)+")"),w.filename.html(g);var C=e("<form style='display:block; position:absolute;left: 150px;' class='"+t.formGroup+"' method='"+a.method+"' action='"+a.url+"' enctype='"+a.enctype+"'></form>");C.appendTo("body");var b=[];b.push(r[o].name),v(C,l,w,b,t,r[o]),t.fileCounter++}else a.showError&&e("<div class='"+a.errorClass+"'><b>"+r[o].name+"</b> "+a.duplicateErrorStr+"</div>").appendTo(t.errorLog);else a.showError&&e("<div class='"+a.errorClass+"'><b>"+r[o].name+"</b> "+a.extErrorStr+a.allowedTypes+"</div>").appendTo(t.errorLog)}function n(e,a,t){var r=a.allowedTypes.toLowerCase().split(/[\s,]+/g),o=t.split(".").pop().toLowerCase();return"*"!=a.allowedTypes&&jQuery.inArray(o,r)<0?!1:!0}function d(e,a){var t=!1;if(e.existingFileNames.length)for(var r=0;r<e.existingFileNames.length;r++)(e.existingFileNames[r]==a||w.duplicateStrict&&e.existingFileNames[r].toLowerCase()==a.toLowerCase())&&(t=!0);return t}function p(e,a){if(e.existingFileNames.length)for(var t=0;t<a.length;t++){var r=e.existingFileNames.indexOf(a[t]);-1!=r&&e.existingFileNames.splice(r,1)}}function u(e,a){if(e){a.show();var t=new FileReader;t.onload=function(e){a.attr("src",e.target.result)},t.readAsDataURL(e)}}function c(a,t){if(a.showFileCounter){var r=e(t.container).find(".ajax-file-upload-filename").length;t.fileCounter=r+1,e(t.container).find(".ajax-file-upload-filename").each(function(){var t=e(this).html().split(a.fileCounterStyle),o=(parseInt(t[0])-1,r+a.fileCounterStyle+t[1]);e(this).html(o),r--})}}function h(t,r,o,s){var i="ajax-upload-id-"+(new Date).getTime(),d=e("<form method='"+o.method+"' action='"+o.url+"' enctype='"+o.enctype+"'></form>"),p="<input type='file' id='"+i+"' name='"+o.fileName+"' accept='"+o.acceptFiles+"'/>";o.multiple&&(o.fileName.indexOf("[]")!=o.fileName.length-2&&(o.fileName+="[]"),p="<input type='file' id='"+i+"' name='"+o.fileName+"' accept='"+o.acceptFiles+"' multiple/>");var u=e(p).appendTo(d);u.change(function(){t.errorLog.html("");var i=(o.allowedTypes.toLowerCase().split(","),[]);if(this.files){for(g=0;g<this.files.length;g++)i.push(this.files[g].name);if(0==o.onSelect(this.files))return}else{var p=e(this).val(),u=[];if(i.push(p),!n(t,o,p))return void(o.showError&&e("<div class='"+o.errorClass+"'><b>"+p+"</b> "+o.extErrorStr+o.allowedTypes+"</div>").appendTo(t.errorLog));if(u.push({name:p,size:"NA"}),0==o.onSelect(u))return}if(c(o,t),s.unbind("click"),d.hide(),h(t,r,o,s),d.addClass(r),o.serialize&&a.fileapi&&a.formdata){d.removeClass(r);var f=this.files;d.remove(),l(o,t,f)}else{for(var w="",g=0;g<i.length;g++)w+=o.showFileCounter?t.fileCounter+o.fileCounterStyle+i[g]+"<br>":i[g]+"<br>",t.fileCounter++;if(-1!=o.maxFileCount&&t.selectedFiles+i.length>o.maxFileCount)return void(o.showError&&e("<div class='"+o.errorClass+"'><b>"+w+"</b> "+o.maxFileCountErrorStr+o.maxFileCount+"</div>").appendTo(t.errorLog));t.selectedFiles+=i.length;var C=new m(t,o);C.filename.html(w),v(d,o,C,i,t,null)}}),o.nestedForms?(d.css({margin:0,padding:0}),s.css({position:"relative",overflow:"hidden",cursor:"default"}),u.css({position:"absolute",cursor:"pointer",top:"0px",width:"100%",height:"100%",left:"0px","z-index":"100",opacity:"0.0",filter:"alpha(opacity=0)","-ms-filter":"alpha(opacity=0)","-khtml-opacity":"0.0","-moz-opacity":"0.0"}),d.appendTo(s)):(d.appendTo(e("body")),d.css({margin:0,padding:0,display:"block",position:"absolute",left:"-250px"}),-1!=navigator.appVersion.indexOf("MSIE ")?s.attr("for",i):s.click(function(){u.click()}))}function f(a,t){return this.statusbar=e("<div class='ajax-file-upload-statusbar'></div>").width(t.statusBarWidth),this.preview=e("<img class='ajax-file-upload-preview' />").width(t.previewWidth).height(t.previewHeight).appendTo(this.statusbar).hide(),this.filename=e("<div class='ajax-file-upload-filename'></div>").appendTo(this.statusbar),this.progressDiv=e("<div class='ajax-file-upload-progress'>").appendTo(this.statusbar).hide(),this.progressbar=e("<div class='ajax-file-upload-bar'></div>").appendTo(this.progressDiv),this.abort=e("<div>"+t.abortStr+"</div>").appendTo(this.statusbar).hide(),this.cancel=e("<div>"+t.cancelStr+"</div>").appendTo(this.statusbar).hide(),this.done=e("<div>"+t.doneStr+"</div>").appendTo(this.statusbar).hide(),this.download=e("<div>"+t.downloadStr+"</div>").appendTo(this.statusbar).hide(),this.del=e("<div>"+t.deletelStr+"</div>").appendTo(this.statusbar).hide(),this.abort.addClass("ajax-file-upload-red"),this.done.addClass("ajax-file-upload-green"),this.download.addClass("ajax-file-upload-green"),this.cancel.addClass("ajax-file-upload-red"),this.del.addClass("ajax-file-upload-red"),this}function m(a,t){var r=null;return r=t.customProgressBar?new t.customProgressBar(a,t):new f(a,t),r.abort.addClass(a.formGroup),r.abort.addClass(t.abortButtonClass),r.cancel.addClass(a.formGroup),r.cancel.addClass(t.cancelButtonClass),t.extraHTML&&(r.extraHTML=e("<div class='extrahtml'>"+t.extraHTML()+"</div>").insertAfter(r.filename)),"bottom"==t.uploadQueuOrder?e(a.container).append(r.statusbar):e(a.container).prepend(r.statusbar),r}function v(t,o,s,l,n,d){var h={cache:!1,contentType:!1,processData:!1,forceSync:!1,type:o.method,data:o.formData,formData:o.fileData,dataType:o.returnType,beforeSubmit:function(a,r,d){if(0!=o.onSubmit.call(this,l)){if(o.dynamicFormData){var u=i(o.dynamicFormData());if(u)for(var h=0;h<u.length;h++)u[h]&&(void 0!=o.fileData?d.formData.append(u[h][0],u[h][1]):d.data[u[h][0]]=u[h][1])}return o.extraHTML&&e(s.extraHTML).find("input,select,textarea").each(function(){void 0!=o.fileData?d.formData.append(e(this).attr("name"),e(this).val()):d.data[e(this).attr("name")]=e(this).val()}),!0}return s.statusbar.append("<div class='"+o.errorClass+"'>"+o.uploadErrorStr+"</div>"),s.cancel.show(),t.remove(),s.cancel.click(function(){x.splice(x.indexOf(t),1),p(n,l),s.statusbar.remove(),o.onCancel.call(n,l,s),n.selectedFiles-=l.length,c(o,n)}),!1},beforeSend:function(e){s.progressDiv.show(),s.cancel.hide(),s.done.hide(),o.showAbort&&(s.abort.show(),s.abort.click(function(){p(n,l),e.abort(),n.selectedFiles-=l.length,o.onAbort.call(n,l,s)})),s.progressbar.width(a.formdata?"1%":"5%")},uploadProgress:function(e,a,t,r){r>98&&(r=98);var i=r+"%";r>1&&s.progressbar.width(i),o.showProgress&&(s.progressbar.html(i),s.progressbar.css("text-align","center"))},success:function(a,r,i){if(s.cancel.remove(),D.pop(),"json"==o.returnType&&"object"==e.type(a)&&a.hasOwnProperty(o.customErrorKeyStr)){s.abort.hide();var d=a[o.customErrorKeyStr];return o.onError.call(this,l,200,d,s),o.showStatusAfterError?(s.progressDiv.hide(),s.statusbar.append("<span class='"+o.errorClass+"'>ERROR: "+d+"</span>")):(s.statusbar.hide(),s.statusbar.remove()),n.selectedFiles-=l.length,void t.remove()}n.responses.push(a),s.progressbar.width("100%"),o.showProgress&&(s.progressbar.html("100%"),s.progressbar.css("text-align","center")),s.abort.hide(),o.onSuccess.call(this,l,a,i,s),o.showStatusAfterSuccess?(o.showDone?(s.done.show(),s.done.click(function(){s.statusbar.hide("slow"),s.statusbar.remove()})):s.done.hide(),o.showDelete?(s.del.show(),s.del.click(function(){s.statusbar.hide().remove(),o.deleteCallback&&o.deleteCallback.call(this,a,s),n.selectedFiles-=l.length,c(o,n)})):s.del.hide()):(s.statusbar.hide("slow"),s.statusbar.remove()),o.showDownload&&(s.download.show(),s.download.click(function(){o.downloadCallback&&o.downloadCallback(a)})),t.remove()},error:function(e,a,r){s.cancel.remove(),D.pop(),s.abort.hide(),"abort"==e.statusText?(s.statusbar.hide("slow").remove(),c(o,n)):(o.onError.call(this,l,a,r,s),o.showStatusAfterError?(s.progressDiv.hide(),s.statusbar.append("<span class='"+o.errorClass+"'>ERROR: "+r+"</span>")):(s.statusbar.hide(),s.statusbar.remove()),n.selectedFiles-=l.length),t.remove()}};o.showPreview&&null!=d&&"image"==d.type.toLowerCase().split("/").shift()&&u(d,s.preview),o.autoSubmit?(t.ajaxForm(h),x.push(t),r()):(o.showCancel&&(s.cancel.show(),s.cancel.click(function(){x.splice(x.indexOf(t),1),p(n,l),t.remove(),s.statusbar.remove(),o.onCancel.call(n,l,s),n.selectedFiles-=l.length,c(o,n)})),t.ajaxForm(h))}var w=e.extend({url:"",method:"POST",enctype:"multipart/form-data",returnType:null,allowDuplicates:!0,duplicateStrict:!1,allowedTypes:"*",acceptFiles:"*",fileName:"file",formData:!1,dynamicFormData:!1,maxFileSize:-1,maxFileCount:-1,multiple:!0,dragDrop:!0,autoSubmit:!0,showCancel:!0,showAbort:!0,showDone:!1,showDelete:!1,showError:!0,showStatusAfterSuccess:!0,showStatusAfterError:!0,showFileCounter:!0,fileCounterStyle:"). ",showFileSize:!0,showProgress:!1,nestedForms:!0,showDownload:!1,onLoad:function(){},onSelect:function(){return!0},onSubmit:function(){},onSuccess:function(){},onError:function(){},onCancel:function(){},onAbort:function(){},downloadCallback:!1,deleteCallback:!1,afterUploadAll:!1,serialize:!0,sequential:!1,sequentialCount:2,customProgressBar:!1,abortButtonClass:"ajax-file-upload-abort",cancelButtonClass:"ajax-file-upload-cancel",dragDropContainerClass:"ajax-upload-dragdrop",dragDropHoverClass:"state-hover",errorClass:"ajax-file-upload-error",uploadButtonClass:"ajax-file-upload",dragDropStr:"<span><b>Drag & Drop Files</b></span>",uploadStr:"Upload",abortStr:"Abort",cancelStr:"Cancel",deletelStr:"Delete",doneStr:"Done",multiDragErrorStr:"Multiple File Drag & Drop is not allowed.",extErrorStr:"is not allowed. Allowed extensions: ",duplicateErrorStr:"is not allowed. File already exists.",sizeErrorStr:"is not allowed. Allowed Max size: ",uploadErrorStr:"Upload is not allowed",maxFileCountErrorStr:" is not allowed. Maximum allowed files are:",downloadStr:"Download",customErrorKeyStr:"jquery-upload-file-error",showQueueDiv:!1,statusBarWidth:400,dragdropWidth:400,showPreview:!1,previewHeight:"auto",previewWidth:"100%",extraHTML:!1,uploadQueuOrder:"top"},t);this.fileCounter=1,this.selectedFiles=0;var g="ajax-file-upload-"+(new Date).getTime();this.formGroup=g,this.errorLog=e("<div></div>"),this.responses=[],this.existingFileNames=[],a.formdata||(w.dragDrop=!1),a.formdata||(w.multiple=!1),e(this).html("");var C=this,b=e("<div>"+w.uploadStr+"</div>");e(b).addClass(w.uploadButtonClass),function F(){if(e.fn.ajaxForm){if(w.dragDrop){var a=e('<div class="'+w.dragDropContainerClass+'" style="vertical-align:top;"></div>').width(w.dragdropWidth);e(C).append(a),e(a).append(b),e(a).append(e(w.dragDropStr)),o(C,w,a)}else e(C).append(b);e(C).append(C.errorLog),C.container=w.showQueueDiv?e("#"+w.showQueueDiv):e("<div class='ajax-file-upload-container'></div>").insertAfter(e(C)),w.onLoad.call(this,C),h(C,g,w,b)}else window.setTimeout(F,10)}(),this.startUpload=function(){e("form").each(function(){e(this).hasClass(C.formGroup)&&x.push(e(this))}),x.length>=1&&r()},this.getFileCount=function(){return C.selectedFiles},this.stopUpload=function(){e("."+w.abortButtonClass).each(function(){e(this).hasClass(C.formGroup)&&e(this).click()}),e("."+w.cancelButtonClass).each(function(){e(this).hasClass(C.formGroup)&&e(this).click()})},this.cancelAll=function(){e("."+w.cancelButtonClass).each(function(){e(this).hasClass(C.formGroup)&&e(this).click()})},this.update=function(a){w=e.extend(w,a)},this.reset=function(e){C.fileCounter=1,C.selectedFiles=0,C.errorLog.html(""),0!=e&&C.container.html("")},this.remove=function(){C.container.html(""),e(C).remove()},this.createProgress=function(e,a,t){var r=new m(this,w);r.progressDiv.show(),r.progressbar.width("100%");var o="";o=w.showFileCounter?C.fileCounter+w.fileCounterStyle+e:e,w.showFileSize&&(o+=" ("+s(t)+")"),r.filename.html(o),C.fileCounter++,C.selectedFiles++,w.showPreview&&(r.preview.attr("src",a),r.preview.show()),w.showDownload&&(r.download.show(),r.download.click(function(){w.downloadCallback&&w.downloadCallback.call(C,[e])})),w.showDelete&&(r.del.show(),r.del.click(function(){r.statusbar.hide().remove();var a=[e];w.deleteCallback&&w.deleteCallback.call(this,a,r),C.selectedFiles-=1,c(w,C)}))},this.getResponses=function(){return this.responses};var x=[],D=[],S=!1;return this}}(jQuery);
(function() {
  window["cama_init_media"] = function(media_panel) {
    var customFileData, media_info, media_info_tab_info, media_link_tab_upload, p_upload, show_file;
    media_info = media_panel.find(".media_file_info");
    media_info_tab_info = media_panel.find(".media_file_info_col .nav-tabs .link_media_info");
    media_link_tab_upload = media_panel.find(".media_file_info_col .nav-tabs .link_media_upload");
    show_file = function(item) {
      var btn, data, img, tpl;
      item.addClass('selected').siblings().removeClass('selected');
      data = eval("(" + item.find(".data_value").val() + ")");
      media_info_tab_info.click();
      tpl = "<div class='p_thumb'></div>" + "<div class='p_label'><b>" + I18n("button.name") + ": </b><br> <span>" + data["name"] + "</span></div>" + "<div class='p_body'>" + "<div><b>" + I18n("button.url") + ":</b><br> <a target='_blank' href='" + data["url"] + "'>" + data["url"] + "</a></div>" + "<div><b>" + I18n("button.size") + ":</b><br> <span>" + data["size"] + "</span></div>" + "</div>";
      if (window["callback_media_uploader"]) {
        if (!media_panel.attr("data-formats") || (media_panel.attr("data-formats") && ($.inArray(data["format"], media_panel.attr("data-formats").split(",")) >= 0 || $.inArray(data["url"].split(".").pop().toLowerCase(), media_panel.attr("data-formats").split(",")) >= 0))) {
          tpl += "<div class='p_footer'>" + "<button class='btn btn-primary insert_btn'>" + I18n("button.insert") + "</button>" + "</div>";
        }
      }
      media_info.html(tpl);
      media_info.find(".p_thumb").html(item.find(".thumb").html());
      if (data["format"] === "image" && media_panel.attr("data-dimension")) {
        img = $('<img src="' + data["url"] + '">').hide();
        btn = media_info.append(img).find(".p_footer .insert_btn");
        btn.prop('disabled', true);
        img.load(function() {
          var cut, hh, ww;
          media_info.find(".p_body").append("<div class='cdimension'><b>" + I18n("button.dimension") + ": </b><span>" + this.width + "x" + this.height + "</span></div>");
          ww = parseInt(media_panel.attr("data-dimension").split("x")[0]) || this.width;
          hh = parseInt(media_panel.attr("data-dimension").split("x")[1]) || this.height;
          if (media_panel.attr("data-dimension") && this.width === ww && this.height === hh) {
            btn.prop('disabled', false);
          } else {
            media_info.find(".cdimension").css("color", 'red');
            cut = $("<button class='btn btn-info pull-right'><i class='fa fa-crop'></i> " + I18n("button.crop_image") + "</button>").click(function() {
              return $.fn.upload_url({
                url: data["url"]
              });
            });
            btn.after(cut);
          }
          return media_info.find(".p_thumb").html(img.show());
        });
      }
      if (window["callback_media_uploader"]) {
        return media_info.find(".insert_btn").click(function() {
          data["mime"] = data["type"];
          window["callback_media_uploader"](data);
          window["callback_media_uploader"] = null;
          media_panel.closest(".modal").modal("hide");
          return false;
        });
      }
    };
    media_panel.on("click", ".file_item", function() {
      show_file($(this));
      return false;
    });
    p_upload = media_panel.find(".cama_media_fileuploader");
    customFileData = function() {
      return {
        folder: media_panel.attr("data-folder"),
        formats: media_panel.attr("data-formats")
      };
    };
    p_upload.uploadFile({
      url: p_upload.attr("data-url"),
      fileName: "file_upload",
      dragDropStr: '<span><b>' + p_upload.attr('data-dragDropStr') + '</b></span>',
      uploadStr: p_upload.attr('data-uploadStr'),
      dynamicFormData: customFileData,
      onSuccess: (function(files, res_upload, xhr, pd) {
        if (res_upload.search("<") === 0) {
          media_panel.trigger("add_file", {
            item: res_upload,
            selected: $(pd.statusbar).siblings().not('.error_file_upload').size() === 0
          });
          return $(pd.statusbar).remove();
        } else {
          return $(pd.statusbar).find(".ajax-file-upload-progress").html("<span style='color: red;'>" + res_upload + "</span>");
        }
      }),
      onError: (function(files, status, errMsg, pd) {
        return $(pd.statusbar).addClass('error_file_upload').find(".ajax-file-upload-filename").append(" <i class='fa fa-times btn btn-danger btn-xs' onclick='$(this).closest(\".ajax-file-upload-statusbar\").remove();'></i>");
      })
    });
    media_panel.find(".media_folder_breadcrumb").on("click", "a", function() {
      return media_panel.trigger("navigate_to", {
        folder: $(this).attr("data-path")
      });
    });
    media_panel.on("click", ".folder_item", function() {
      return media_panel.trigger("navigate_to", {
        folder: media_panel.attr("data-folder") + "/" + $(this).attr("data-key")
      });
    });
    media_panel.bind("update_breadcrumb", function() {
      var breadrumb, folder, folder_items, folder_prefix, i, index, len, name, value;
      folder = media_panel.attr("data-folder").replace("//", "/");
      folder_prefix = [];
      if (folder === "/" || folder === "") {
        folder_items = ["/"];
      } else {
        folder_items = folder.split("/");
      }
      breadrumb = [];
      for (index = i = 0, len = folder_items.length; i < len; index = ++i) {
        value = folder_items[index];
        name = value;
        if (value === "/" || value === "") {
          name = I18n("button.root");
        }
        if (index === folder_items.length - 1) {
          breadrumb.push("<li><span>" + name + "</span></li>");
        } else {
          folder_prefix.push(value);
          breadrumb.push("<li><a data-path='" + (folder_prefix.join("/") || "/") + "' href='#'>" + name + "</a></li>");
        }
      }
      return media_panel.find(".media_folder_breadcrumb").html(breadrumb.join(""));
    }).trigger("update_breadcrumb");
    media_panel.bind("navigate_to", function(e, data) {
      var folder;
      if (data["folder"]) {
        media_panel.attr("data-folder", data["folder"]);
      }
      folder = media_panel.attr("data-folder");
      media_panel.trigger("update_breadcrumb");
      media_info.html("");
      media_link_tab_upload.click();
      showLoading();
      return $.get(media_panel.attr("data-url"), {
        folder: folder,
        partial: true,
        media_formats: media_panel.attr("data-formats")
      }, function(res) {
        media_panel.find(".media_browser_list").html(res);
        return hideLoading();
      });
    }).bind("add_file", function(e, data) {
      var item;
      item = $(data["item"]);
      media_panel.find(".media_browser_list").prepend(item);
      if (data["selected"] === true || data["selected"] === void 0) {
        return item.click();
      }
    });
    media_panel.on("click", "a.add_folder", function() {
      var callback, content;
      content = $("<form><div><label for=''>" + I18n('button.folder') + ": </label> <div class='input-group'><input name='folder' class='form-control required' placeholder='Folder name..'><span class='input-group-btn'><button class='btn btn-primary' type='submit'>" + I18n('button.create') + "</button></span></div></div> </form>");
      callback = function(modal) {
        var btn, input;
        btn = modal.find(".btn-primary");
        input = modal.find("input").keyup(function() {
          if ($(this).val()) {
            return btn.removeAttr("disabled");
          } else {
            return btn.attr("disabled", "true");
          }
        }).trigger("keyup");
        return modal.find("form").submit(function() {
          showLoading();
          $.post(media_panel.attr("data-url_actions"), {
            folder: media_panel.attr("data-folder") + "/" + input.val(),
            media_action: "new_folder"
          }, function(res) {
            hideLoading();
            modal.modal("hide");
            if (res.search("<") === 0) {
              return media_panel.find(".media_browser_list").append(res);
            } else {
              return $.fn.alert({
                type: 'error',
                content: res,
                title: "Error"
              });
            }
          });
          return false;
        });
      };
      open_modal({
        title: "New Folder",
        content: content,
        callback: callback
      });
      return false;
    });
    media_panel.on("click", "a.del_item, a.del_folder", function() {
      var item, link;
      if (!confirm(I18n("msg.delete_item"))) {
        return false;
      }
      link = $(this);
      item = link.closest(".media_item");
      showLoading();
      $.post(media_panel.attr("data-url_actions"), {
        folder: media_panel.attr("data-folder") + "/" + item.attr("data-key"),
        media_action: link.hasClass("del_folder") ? "del_folder" : "del_file"
      }, function(res) {
        hideLoading();
        if (res) {
          return $.fn.alert({
            type: 'error',
            content: res,
            title: I18n("button.error")
          });
        } else {
          item.remove();
          return media_info.html("");
        }
      }).error(function() {
        return $.fn.alert({
          type: 'error',
          content: I18n("msg.internal_error"),
          title: I18n("button.error")
        });
      });
      return false;
    });
    return media_panel.find("#cama_media_external").submit(function() {
      if (!$(this).valid()) {
        return false;
      }
      $.fn.upload_url({
        url: $(this).find("input").val(),
        callback: function() {
          return media_panel.find("#cama_media_external")[0].reset();
        }
      });
      return false;
    }).validate();
  };

  $(function() {
    return $.fn.upload_url = function(args) {
      var data, media_panel, on_error;
      media_panel = $("#cama_media_gallery");
      data = {
        folder: media_panel.attr("data-folder"),
        media_action: "crop_url",
        formats: media_panel.attr("data-formats"),
        onerror: function(message) {
          return $.fn.alert({
            type: 'error',
            content: message,
            title: I18n("msg.error_uploading")
          });
        }
      };
      $.extend(data, args);
      on_error = data["onerror"];
      delete data["onerror"];
      showLoading();
      return $.post(media_panel.attr("data-url_actions"), data, function(res_upload) {
        hideLoading();
        if (res_upload.search("<") === 0) {
          media_panel.trigger("add_file", {
            item: res_upload
          });
          if (data["callback"]) {
            return data["callback"](res_upload);
          }
        } else {
          return $.fn.alert({
            type: 'error',
            content: res_upload,
            title: I18n("button.error")
          });
        }
      }).error(function() {
        return $.fn.alert({
          type: 'error',
          content: I18n("msg.internal_error"),
          title: I18n("button.error")
        });
      });
    };
  });

  $(function() {
    return $.fn.upload_filemanager = function(args) {
      args = args || {};
      return open_modal({
        title: args["title"] || I18n("msg.media_title"),
        id: 'cama_modal_file_uploader',
        modal_size: "modal-lg",
        mode: "ajax",
        url: root_url + "/admin/media/ajax",
        ajax_params: {
          media_formats: args["formats"],
          dimension: args["dimension"]
        },
        callback: function(modal) {
          if (args["selected"]) {
            window["callback_media_uploader"] = args["selected"];
          }
          return modal.css("z-index", args["zindex"] || 99999).children(".modal-dialog").css("width", "90%");
        }
      });
    };
  });

}).call(this);



