var esd = esd || {};
esd.reports = (function (r) {


    var urls = {
        save: '/operations/save',
        saveComponent: '/operations/saveComponent',
        saveSortOrders: '/operations/saveSortOrders',
        removeComponent: '/operations/removeComponent',
        evaluateText: '/operations/evaluateText'
    },


    constants = {
        landscapeScale: 0.8534,
        emergencyDefaultDimensionLength: 10
    },


    getDimensionLength = function(length, isLandscape) {
        if (typeof length !== "number")
            return length; // assume auto or null or some other message

        if (length < constants.emergencyDefaultDimensionLength) {
            length = constants.emergencyDefaultDimensionLength;
        }

        if (!isLandscape)
            return Math.floor(length) + 'px';

        return Math.floor(constants.landscapeScale * length) + 'px';
    },


    tableBuilder = new esd.reports.TableBuilder(),


    // something to aid the animation of the progress bars
    ProgressBar = function ($progressDiv) {
        var $progress = $progressDiv.children('div.progress-bar'),
            $fill = $progress.children('div.fill'),
            value = 0,
            min = 0,
            max = 0,
            fadeOutId = false;

        function fadeOut() {
            $progressDiv.fadeOut(800);
        };

        function update() {
            if (value > max) {
                value = max;
            }
            var percentage = (max - min) === 0 ? 100 : Math.ceil(100 * value / (max - min));
            $fill.animate({ width: percentage + '%' }, 'fast', 'linear');

            if (value === max) {
                fadeOutId = setTimeout(fadeOut, 400);
            }
            else {
                clearTimeout(fadeOutId);
                fadeOutId = false;
                $progressDiv.stop().show();
            }
        };

        this.increase = function () {
            value++;
            update();
        };

        this.end = function () {
            value = max;
            update();
        };

        this.increaseMax = function () {
            max++;
            update();
        };

        fadeOutId = setTimeout(update, 800);
    },


    // http://stackoverflow.com/questions/4785724/queue-ajax-requests-using-jquery-queue
    ajaxManager = (function () {
        var requests = [],
            $saving;

        function run() {
            var originalComplete;

            if (requests.length !== 1) {
                return;
            }

            originalComplete = requests[0].complete;

            requests[0].complete = function (e) {
                if (typeof originalComplete === 'function') {
                    originalComplete(e);
                }

                requests.shift();

                if (requests.length) {
                    run();
                }
                else if ($saving) {
                    $saving.hide();
                }
            };

            if ($saving) {
                $saving.show();
            }

            $.ajax(requests[0]);
        }

        return {
            init: function ($savingPanel) {
                $saving = $savingPanel;
            },

            add: function (ajaxParameters) {
                requests.push(ajaxParameters);

                if (requests.length === 1) {
                    run();
                }
            }
        };
    } ()),


    insertManager = (function () {

        var delay = 200,
            $childContainer, childSelector, $window, timerId, $target,

            setTarget = function () {
                var $children = $childContainer.find(childSelector),
                    windowScrollTop = $window.scrollTop(),
                    windowHeight = $window.height(),
                    middle = windowScrollTop + windowHeight / 2,
                    $result = $($children[0]),
                    i, $el, top, bottom;

                if (windowScrollTop === 0) {
                    $result = $($children[0]);
                }
                else if (windowScrollTop === $(document).outerHeight(true) - windowHeight) {
                    $result = $($children[$children.length - 1]);
                }
                else {
                    for (i = 1; i < $children.length; i++) {
                        $el = $($children[i]);
                        top = $el.offset().top;
                        bottom = top + $el.outerHeight(true);

                        // find the element to insert after
                        if (bottom > middle) {
                            $result = (top + (bottom - top) / 2 > middle)
                                ? $($children[i - 1])
                                : $el;

                            break;
                        }

                        $result = $el;
                    }
                }

                $children.removeClass('insertTarget');
                $result.addClass('insertTarget');
                $target = $result;
            },

            onScroll = function () {
                clearTimeout(timerId);
                timerId = setTimeout(setTarget, delay);
            };

        return {
            init: function ($container, selector) {
                $childContainer = $container;
                childSelector = selector;
                $window = $(window);

                $window.bind('scroll', onScroll);

                onScroll();
            },

            refresh: function () {
                onScroll();
            },

            getTarget: function () {
                return $target[0];
            }
        };

    } ()),


    moveManager = (function () {
        var delay = 200,
            absDistance = 100,
            $childContainer, childSelector, $document, $window, $body, timerId, $target, pageY,
            $top, $bottom,
            currentEl = false,

            setTarget = function () {
                var $children = $childContainer.find(childSelector),
                    el, i, $el, top, bottom, $result = null,
                    after = false;

                for (i = 1; i < $children.length; i++) {
                    el = $children[i];

                    if (el === currentEl) {
                        after = true;
                    }

                    $el = $(el);

                    top = $el.offset().top;
                    bottom = top + $el.outerHeight(true);

                    // find the element to insert after
                    if (bottom > pageY) {
                        $result = after
                                ? $el
                                : $($children[i - 1]);

                        break;
                    }

                    $result = $el;
                }

                $children.removeClass('moveTarget');
                if ($result) {
                    $result.addClass('moveTarget');
                }
                $target = $result;
            },

            clearTimer = function () {
                timerId = false;

                setTarget();
            },

            onMouseMove = function (e) {
                pageY = e.pageY;

                if (timerId) {
                    return; // this just prevents us from setting the target every milisecond we move the mouse
                }

                setTarget();
                timerId = setTimeout(clearTimer, delay);
            },

            startScrolling = function (distance) {
                pageY = pageY - distance;
                log(pageY);
                $body.stop().animate({
                    scrollTop: ($window.scrollTop() - distance)
                }, 200, 'linear', function () {
                    startScrolling(distance);
                });
            },

            stopScrolling = function () {
                $body.stop();
            },

            onMouseEnterTop = function () {
                startScrolling(absDistance);
            },

            onMouseLeaveTop = function () {
                stopScrolling();
            },

            onMouseEnterBottom = function () {
                startScrolling(-absDistance);
            },

            onMouseLeaveBottom = function () {
                stopScrolling();
            };

        return {
            init: function ($container, selector) {
                $childContainer = $container;
                childSelector = selector;
                $document = $(document);
                $window = $(window);
                $body = $('html, body');

                $top = $('#top').hide().on('mouseenter', onMouseEnterTop).on('mouseleave', onMouseLeaveTop);
                $bottom = $('#bottom').hide().on('mouseenter', onMouseEnterBottom).on('mouseleave', onMouseLeaveBottom);
            },

            on: function (el) {
                currentEl = el;
                $document.on('mousemove', onMouseMove);

                $top.show();
                $bottom.show();
            },

            off: function () {
                stopScrolling();
                $top.hide();
                $bottom.hide();

                $childContainer.find(childSelector).removeClass('moveTarget');
                currentEl = false;
                $document.off('mousemove', onMouseMove);
            },

            getTarget: function () {
                if (!$target) {
                    return null;
                }
                return $target[0];
            }
        };
    } ()),


    dataLoader = (function () {
        var requests = [],
            events = new esd.core.Events();

        function loadText(request) {
            $.ajax({
                type: 'post',
                dataType: 'json',
                url: urls.evaluateText,
                data: {
                    text: request.text,
                    oa: global.authorityArea,
                    pa: global.areaGroup,
                    a: global.area
                },
                success: function (result) {
                    //log('end success: ' + request.comment);
                    request.component[request.field](result.html);
                    next();
                },
                error: function () {
                    //log('end error: ' + request.comment);
                    next();
                }
            });
        }

        function loadImage(request) {
            $('<img />') // loading with a disposable image tag - just because i don't know how otherwise
                .css({ width: request.width, height: request.height })
                .load(function () {
                    //log('end success: ' + request.comment);
                    request.component.content(request.url);
                    request.component.loading(false);
                    next();
                }).error(function () {
                    //log('end error: ' + request.comment);
                    request.component.missing(true);
                    request.component.loading(false);
                    next();
                })
                .attr('src', request.url);
        }


        function loadTable(request) {
            var params = {
                //pa: global.areaGroup // question - is this still needed? table url already has it. is it really required? - I think not anymore
            };

            $.ajax({
                type: 'get',
                dataType: 'json',
                url: request.url,
                data: params,
                success: function (result) {
                    //log('end success: ' + request.comment);
                    var html = tableBuilder.buildTable(result, { insertWbr: true });
                    request.component.content(html);
                    request.component.loading(false);
                    next();
                },
                error: function () {
                    //log('end error: ' + request.comment);
                    request.component.missing(true);
                    request.component.loading(false);
                    next();
                }
            });
        }


        function execute(request) {
            //log('start: ' + request.comment);

            events.trigger('execute');

            if (request.type === 'text') {
                loadText(request);
            }
            else if (request.type === 'image') {
                loadImage(request);
            }
            else if (request.type === 'table') {
                loadTable(request);
            }
            else {
                next();
            }
        }


        function next() {

            events.trigger('executed');

            requests.shift();

            if (!requests.length) {
                events.trigger('done');
                return;
            }

            execute(requests[0]);
        }


        var DataLoader = function () {
            this.add = function (request) {
                events.trigger('add');

                requests.push(request);

                if (requests.length === 1) {
                    execute(requests[0]);
                }
            };
        };


        DataLoader.prototype = events;


        return new DataLoader();
    } ()),


    deleteManager = (function () {
        var confirmDeleteBox,
            fnOnConfirm = false;

        return {
            init: function ($content) {
                confirmDeleteBox = new esd.core.ContentBox({
                    enableClose: false,
                    panelClass: 'simple small',
                    $content: $content
                });

                confirmDeleteBox.$content.on('click', 'input.cancel', function () {
                    fnOnConfirm = false;
                    confirmDeleteBox.hide();
                })
                .on('click', 'input.delete', function () {
                    if (fnOnConfirm) {
                        fnOnConfirm();
                    }
                    fnOnConfirm = false;
                    confirmDeleteBox.hide();
                });
            },

            confirmDelete: function (onConfirm) {
                fnOnConfirm = onConfirm;
                confirmDeleteBox.show();
            }
        };
    } ());


    function getSortOrder(index) {
        return 10 * (index + 1);
    }


    function replaceTokens(text) {

        return esd.core.replaceText(text, global.textReplacements);

        //var replacements = global.textReplacements,
        //    label,
        //    regex;

        //if (typeof text !== 'string')
        //    return '';

        //for (label in replacements) {
        //    regex = new RegExp(esd.core.escapeRegExp(label), 'gi');
        //    text = text.replace(regex, replacements[label]);
        //}

        //return text;
    }


    function format(text) {
        if (typeof text !== 'string')
            return '';

        // html encode the text
        text = esd.core.htmlEncode(text);

        // handle new lines
        return replaceTokens(
            text.replace(/\n/g, '<br />')
        );
    }


    function needsEvaluating(text) {
        if (!text || typeof text !== 'string')
            return false;
        return true; // text.indexOf('{=') !== -1;
    }


    function ComponentEditPanel() {
        // DON'T MAKE THIS TOO IMPORTANT - IT IS NOT AN OBSERVABLE, MODEL, OR ANYTHING - JUST A SMALL GATEWAY TO CONTROL THE COMPONENT EDIT PANELS
        // controlls and tags:
        var self = this,
            $componentForm = $('#componentForm'),
            iframe = $componentForm.find('iframe')[0],
            $loadingPanel = $componentForm.find('.loadingPanel'),
            loadingTimeoutId = false,
            extra = false,
            contentBox = new esd.core.ContentBox({ enableClose: false, panelClass: 'simple large' }),
            modes = {
                report: '/components/report',
                text: '/components/text',
                table: '/components/table',
                chart: '/components/chart',
                map: '/components/map'
            };

        // some functions are avaliable to the child frame (as a hack)
        window.frameLoaded = frameLoaded;
        window.revert = revert;

        contentBox.setContent($componentForm);


        this.open = function (component, field) {

            var mode = (component && component.type && modes[component.type]) ? modes[component.type] : modes.report,
                model = component.toJson(),
                textField = (component.type === 'report') ? 'introduction' : 'text',
                text = model[textField],
                url;

            extra = {};
            extra[textField] = text;

            model.type = component.type;
            delete model[textField];
            if (field) {
                model.field = field;
            }

            if (component.subType) {
                model.subType = component.subType;
            }

            // used for history (determins if the tab should be shown at all, and what history to load)
            if (!component.isNew()) {
                model.id = component.id();
            }
            // used for history (determins which revision is actually selected)
            if (component.historyId) {
                model.historyId = component.historyId;
            }

            url = mode + '?' + $.param(model, true);

            $loadingPanel.show();
            loadingTimeoutId = setTimeout(function () {
                $loadingPanel.addClass('loading');
            }, 500);
            iframe.contentWindow.location.replace(url);
            contentBox.show();
        };


        this.isValid = function () {
            if (!iframe.contentWindow || !iframe.contentWindow.validate) {
                return true;
            }

            return iframe.contentWindow.validate().isValid;
        };


        this.get = function () {
            if (!iframe.contentWindow || !iframe.contentWindow.get) {
                return false;
            }

            return iframe.contentWindow.get();
        };


        this.close = function () {
            contentBox.hide();
        };


        // these functions have been added as a hack to disable/enable the main part when child popups are opened/closed
        // they rely on css to do this

        this.disable = function () {
            contentBox.$panel.addClass('disabled');//.find('disable-panel').fadeIn(400);
        };


        this.enable = function () {
            contentBox.$panel.removeClass('disabled');
        };


        this.report = false;


        this.bindToReport = function (report) {
            this.report = report;
        };


        function frameLoaded() {
            if (iframe.contentWindow && iframe.contentWindow.setExtra) {
                iframe.contentWindow.setExtra(extra);
            }

            $(iframe.contentWindow).on('submit', function (e) {
                self.report.saveAndClose(e);
            });
            clearTimeout(loadingTimeoutId);
            $loadingPanel.fadeOut(400, function () {
                $loadingPanel.removeClass('loading');
            });
        }


        function revert(historyComponent) {
            var component;

            if (!historyComponent)
                return;

            component = (historyComponent.Type === 'report')
                ? new ReportModel(self, historyComponent)
                : new ComponentModel(self.report, historyComponent);

            self.open(component);
        }
    }


    function ReportModel(editPanel, initialModel, canEdit, editing) {

        var i, components;


        this.editPanel = editPanel;


        this.type = 'report';

        this.id = ko.observable(initialModel.Id);

        this.title = ko.observable(initialModel.Title);
        this.evaluatedTitle = ko.observable(false);
        this.introduction = ko.observable(initialModel.Introduction);
        this.evaluatedIntroduction = ko.observable(false);
        this.includeGlossary = ko.observable(initialModel.IncludeGlossary);
        this.isLandscape = ko.observable(initialModel.IsLandscape);
        this.permission = ko.observable(initialModel.Permission);

        // usefull to know what revision we are on
        this.historyId = (initialModel.HistoryId) ? initialModel.HistoryId : false;

        // a flag that tells us if the orientation has been changed
        this.isLandscapeDirty = ko.observable(false);

        this.isNew = ko.computed(function () {
            return !this.id();
        }, this);


        this.formattedTitle = ko.computed(function () {
            if (!this.evaluatedTitle())
                return format(this.title());
            return this.evaluatedTitle();
        }, this);


        this.formattedIntroduction = ko.computed(function () {
            if (!this.evaluatedIntroduction())
                return format(this.introduction());
            return this.evaluatedIntroduction();
        }, this);


        //this.hasEvaluated = ko.computed(function() {
        //    return (this.evaluatedTitle() && this.evaluatedIntroduction());
        //}, this);


        components = [];
        if (initialModel && initialModel.Components) {
            for (i = 0; i < initialModel.Components.length; i++) {
                components.push(new ComponentModel(this, initialModel.Components[i]));
            }
        }

        this.components = ko.observableArray(components);
        this.insertIndex = false; // the place to insert a new component - calculated when we first open the new component
        this.editingComponent = false;
        this.movingComponent = false;

        // the current mode:
        this.canEdit = ko.observable(canEdit);
        this.editing = ko.observable(editing); // are we editing the document as a whole
        this.moving = ko.observable(false); // may be redundant given we already store the movingComponent (although not as an observable)


        this.isEvaluating = ko.computed(function () {
            return (this.title() && !this.evaluatedTitle()) || (this.introduction() && !this.evaluatedIntroduction());
        }, this);


        this.edit = function (field) {
            this.editingComponent = this; // editing the report as a whole        
            this.editPanel.open(this, field);
        };


        this.cancelClick = function () {
            return false;
        };


        this.editComponent = function (component, field) {
            this.editingComponent = component;
            this.editPanel.open(this.editingComponent, field);
        };


        this.removeComponent = function (component) {
            var self = this;

            deleteManager.confirmDelete(function () {
                var index = self.components.indexOf(component);

                self.components.splice(index, 1);

                ajaxManager.add({
                    type: 'post',
                    dataType: 'json',
                    url: urls.removeComponent,
                    data: { id: component.id() }
                });

                self.saveSortOrders();
            });
        };


        this.moveComponent = function (component, el) {
            this.movingComponent = component;
            this.movingComponent.moving(true);
            this.moving(true);

            moveManager.on($(el).closest('.component')[0]);
        };


        this.endMoveComponent = function () {
            var target = moveManager.getTarget(),
                targetComponent;

            moveManager.off();

            if (!this.movingComponent || !target) {
                this.moving(false);
                if (this.movingComponent) {
                    this.movingComponent.moving(false);
                }
                this.movingComponent = false;
                return;
            }

            targetComponent = ko.dataFor(target);

            if (targetComponent !== this.movingComponent) {
                this.moveComponentAfter(this.movingComponent, targetComponent);
            }

            this.moving(false);
            this.movingComponent.moving(false);
            this.movingComponent = false;
        };


        this.moveComponentAfter = function (moving, target) {
            var targetIndex = this.components.indexOf(target),
                movingIndex = this.components.indexOf(moving);

            this.components.splice(movingIndex, 1);

            if (targetIndex > movingIndex) {
                targetIndex -= 1;
            }

            this.components.splice(targetIndex + 1, 0, moving);

            this.saveSortOrders();
        };


        this.scrollTo = function (el) {
            var $window, $el, top, scrollTop, elHeight, winHeight;
            log('scrollTo');

            if (el.nodeType !== 1) {
                return;
            }

            setTimeout(function () { // this set time out gives the browser time to render everything after a move (otherwise top etc seem wrong)
                $window = $(window);
                $el = $(el);
                top = $el.offset().top;
                scrollTop = $window.scrollTop();
                elHeight = $el.outerHeight(true);
                winHeight = $window.height();

                if (top < scrollTop) {
                    $('html, body').animate({
                        scrollTop: top
                    }, 500);
                }
                else if (top + elHeight > scrollTop + winHeight) {
                    if (elHeight > winHeight) {
                        $('html, body').animate({
                            scrollTop: top
                        }, 500);
                    }
                    else {
                        $('html, body').animate({
                            scrollTop: top - winHeight + elHeight
                        }, 500);
                    }
                }

                $el.css({
                    'background-color': '#DCEAF8'
                })
                .animate({
                    'background-color': 'transparent'
                }, 2000);
            }, 100);
        };


        this.createComponent = function (componentType, componentSubType) {
            var targetComponent = ko.dataFor(insertManager.getTarget());
            this.insertIndex = this.components.indexOf(targetComponent);

            this.editingComponent = new ComponentModel(this, { TypeName: componentType, SubTypeName: componentSubType });
            this.editPanel.open(this.editingComponent);
        };


        this.toJson = function () {
            return {
                title: this.title(),
                introduction: this.introduction(),
                includeGlossary: this.includeGlossary(),
                isLandscape: this.isLandscape(),
                permission: this.permission(),
                pa: global.areaGroup,
                a: global.area
            };
        };


        this.update = function (model) {
            this.isLandscapeDirty(this.isLandscape() !== model.isLandscape); // update the flag

            this.title(model.title);
            this.introduction(model.introduction);
            this.includeGlossary(model.includeGlossary);
            this.isLandscape(model.isLandscape);
            this.permission(model.permission);

            this.evaluatedTitle(false);
            this.evaluatedIntroduction(false);
        };


        // save the report to the database
        this.save = function (model) {
            var self = this;

            model.id = this.id();

            ajaxManager.add({
                type: 'post',
                dataType: 'json',
                url: urls.save,
                data: model,
                success: function (result) {
                    self.saved(result);
                },
                error: function (result) {
                    self.savedFailed(result);
                }
            });
        };


        this.saved = function (result) {
            if (result.error) {
                this.saveFailed(result);
            }

            if (!this.id()) {
                this.id(result.Id);

                if (window.history && window.history.replaceState) {
                    window.history.replaceState({}, null, this.id() + '/edit');
                } else {
                    window.location.href = this.id() + '/edit'; // try a normal redirect
                }
            }

            if (this.isLandscapeDirty()) {
                this.isLandscapeDirty(false);
            }

            this.fetchData(result.ComponentsToUpdate);
        };


        this.saveFailed = function (result) {
            if (result.message) {
                alert('failed to save: ' + result.message);
            }
            else {
                alert('failed to save for unknown reason');
            }
        };


        this.fetchData = function (updates) {
            var j, allComponents;

            if (needsEvaluating(this.title())) {
                dataLoader.add({
                    //comment: 'evaluating report title',
                    type: 'text',
                    component: this,
                    field: 'evaluatedTitle',
                    text: this.title()
                });
            } else {
                this.evaluatedTitle(this.title());
            }

            if (needsEvaluating(this.introduction())) {
                dataLoader.add({
                    //comment: 'evaluating report introduction',
                    type: 'text',
                    component: this,
                    field: 'evaluatedIntroduction',
                    text: this.introduction()
                });
            } else {
                this.evaluatedIntroduction(this.introduction());
            }

            if (updates === true) { // all of them
                allComponents = this.components();
                for (j = 0; j < allComponents.length; j++) {
                    allComponents[j].fetchData();
                }
            }
            else if (updates && updates.length) {
                updateComponents(this.components(), updates);
            }
        };


        // Saves the current report or component
        this.saveAndClose = function () {
            var model;

            if (!this.editingComponent || !this.editPanel.isValid()) {
                return;
            }

            model = this.editPanel.get();

            this.editingComponent.update(model);

            if (this.editingComponent != this && this.editingComponent.isNew()) {
                if (!this.components().length) {
                    this.components.push(this.editingComponent);
                }
                else {
                    this.components.splice(this.insertIndex + 1, 0, this.editingComponent);
                }
            }

            this.editingComponent.save(model);
            this.saveSortOrders();

            this.editPanel.close();
            this.editingComponent = false;

            insertManager.refresh();
        };


        this.saveSortOrders = function () {
            var j, id,
                allComponents = this.components(),
                data;

            if (!this.id()) {
                return;
            }

            data = {
                reportId: this.id(),
                ids: [],
                sortOrders: []
            };

            for (j = 0; j < allComponents.length; j++) {
                id = allComponents[j].id();
                if (!id) {
                    continue;
                }
                data.ids.push(id);
                data.sortOrders.push(getSortOrder(j));
            }

            ajaxManager.add({
                type: 'post',
                dataType: 'json',
                url: urls.saveSortOrders,
                data: data,
                traditional: true
            });
        };


        this.cancelAndClose = function () {
            if (this.isNew()) {
                window.location.href = '/reports/';
                return;
            }
            this.editPanel.close();
            this.editingComponent = false;
        };


        this.disableSaveCancel = function() {
            this.editPanel.disable();
        };


        this.enableSaveCancel = function () {
            this.editPanel.enable();
        };


        this.isLandscape.subscribe(function() {

        });


        function updateComponents(allComponents, updates) {
            var id, j, component, update;

            for (j = 0; j < allComponents.length; j++) {
                component = allComponents[j];
                id = component.id();
                update = _.find(updates, function (c) {
                    return c.Id === id;
                });

                if (!update) {
                    continue;
                }

                component.content(false);
                component.missing(false);
                component.loading(true);
                component.query(update.Query);
                component.fetchData();
            }
        }
    }


    function ComponentModel(parentReport, initialModel) {
        // the presence of the "Query" property on the initial model will determin if the actual query is parsed 
        // or the string one on the component itself.
        initialModel = $.extend({ TypeName: 'text', Query: 'pa={parent-area-identifier}:{child-area-type-identifier}' }, initialModel);

        this.id = ko.observable(initialModel.Id);
        this.type = initialModel.TypeName;
        this.subType = initialModel.SubTypeName;
        this.report = parentReport;

        this.isNew = ko.computed(function () {
            return !this.id();
        }, this);

        this.heading = ko.observable(initialModel.Heading);
        this.evaluatedHeading = ko.observable(false);
        this.text = ko.observable(initialModel.Text);
        this.evaluatedText = ko.observable(false);
        this.query = ko.observable(initialModel.Query);
        this.position = ko.observable(initialModel.Position);

        // usefull to know what revision we are on
        this.historyId = (initialModel.HistoryId) ? initialModel.HistoryId : false;

        this.content = ko.observable(false);
        this.missing = ko.observable(false);
        this.loading = ko.observable(true); // can be indepenedent of the other two

        this.moving = ko.observable(false);

        this.isEvaluating = ko.computed(function() {
            return (this.heading() && !this.evaluatedHeading()) || (this.text() && !this.evaluatedText());
        }, this);

        this.isReportLandscape = ko.computed(function () {
            return this.report.isLandscape();
        }, this);

        this.formattedHeading = ko.computed(function () {
            if (!this.evaluatedHeading())
                return format(this.heading());
            return this.evaluatedHeading();
        }, this);

        this.formattedText = ko.computed(function () {
            if (!this.evaluatedText())
                return format(this.text());
            return this.evaluatedText();
        }, this);

        this.toJson = function () {
            //if (this.type === 'table') {
            //    return {
            //        id: this.id(),
            //        pa: global.areaGroup,
            //        a: global.area,
            //        position: this.position(),
            //        isReportLandscape: this.defaultIsLandscape()
            //    };
            //}

            return {
                heading: this.heading(),
                text: this.text(),
                query: this.query(),
                position: this.position(),
                isReportLandscape: this.isReportLandscape(),
                pa: global.areaGroup,
                a: global.area
            };
        };

        this.update = function (model) {
            this.heading(model.heading);
            this.text(model.text);
            this.query(model.query);
            this.position(model.position);

            this.evaluatedHeading(false);
            this.evaluatedText(false);
            this.content(false);
            this.missing(false);
            this.loading(true);
        };

        // save the component to the database
        this.save = function (model) {
            var self = this,
                index = this.report.components.indexOf(this);

            model.type = this.type;
            model.reportId = this.report.id();
            model.id = this.id();
            model.sortOrder = getSortOrder(index);

            ajaxManager.add({
                type: 'post',
                dataType: 'json',
                url: urls.saveComponent,
                data: model,
                success: function (result) {
                    self.saved(result);
                },
                error: function (result) {
                    self.savedFailed(result);
                }
            });
        };

        this.saved = function (result) {
            if (result.error) {
                this.saveFailed(result);
            }

            if (!this.id()) {
                this.id(result.Id);
            }

            this.fetchData();
        };

        this.saveFailed = function (result) {
            if (result.message) {
                alert('save failed: ' + result.message);
            }
            else {
                alert('save failed for unknown reason');
            }
        };

        this.fetchData = function () {
            if (needsEvaluating(this.heading())) {
                dataLoader.add({
                    //comment: 'evaluating component ' + this.id() + ' heading',
                    type: 'text',
                    component: this,
                    field: 'evaluatedHeading',
                    text: this.heading()
                });
            }

            if (needsEvaluating(this.text())) {
                dataLoader.add({
                    //comment: 'evaluating component ' + this.id() + ' text',
                    type: 'text',
                    component: this,
                    field: 'evaluatedText',
                    text: this.text()
                });
            }

            var urlSuffix = (global.addExtra)
                ? '&' + global.extra + '=' + global.addExtra
                : '';

            if (global.uniqueKey) {
                urlSuffix += '&' + global.uniqueKey + '=';
            }

            if (this.type === 'chart' || this.type === 'map') {
                dataLoader.add({
                    //comment: 'evaluating component ' + this.id() + ' image',
                    type: 'image',
                    width: this.width(),
                    height: this.height(),
                    component: this,
                    url: '/image/' + this.type + '?' + replaceTokens(this.query()) + urlSuffix
                });
            }
            else if (this.type === 'table') {
                dataLoader.add({
                    //comment: 'evaluating component ' + this.id() + ' table',
                    type: 'table',
                    component: this,
                    url: '/table/data?' + replaceTokens(this.query()) + urlSuffix
                });
            }
        };

        // some helper methods:

        this.hasHeadingAtTop = ko.computed(function () {
            return !!this.heading(); // heading is always at the top if it exists
        }, this);

        this.hasTextAtTop = ko.computed(function () {
            if (this.text() === '')
                return false;
            if (this.type === 'text')
                return true;

            return (this.position() === 'T');
        }, this);

        this.hasTextNotAtTop = ko.computed(function () {
            if (this.text() === '')
                return false;
            if (this.type === 'text')
                return false;

            return (this.position() !== 'T');
        }, this);

        this.hasTextAtBottom = ko.computed(function () {
            if (this.text() === '')
                return false;
            if (this.type === 'text')
                return false;

            return (this.position() === 'B');
        }, this);

        this.isTable = ko.computed(function () {
            return (this.type === 'table');
        }, this);

        this.isChartOrMap = ko.computed(function () {
            return (this.type === 'chart' || this.type === 'map');
        }, this);

        this.width = ko.computed(function () {
            if (!this.isChartOrMap())
                return null;

            // duplicated from esd.reports.core->calculateWidth

            var position = this.position(),
                isHalfWidth = (position === 'L' || position === 'R'),
                isLandscape = this.isReportLandscape();

            // this does kind of duplicate the Component.Width property
            if (!isHalfWidth) {
                return isLandscape
                    ? window.global.fullLandscapeWidth
                    : window.global.fullPortraitWidth;
            }

            return isLandscape
                ? window.global.halfLandscapeWidth
                : window.global.halfPortraitWidth;

        }, this);

        // used to shrink the dimensions for the preview
        this.previewWidth = ko.computed(function () {
            return getDimensionLength(this.width(), this.isReportLandscape());
        }, this);

        this.height = ko.computed(function () {
            var qs, height;

            if (!this.isChartOrMap())
                return null;

            qs = esd.core.queryString(this.query());
            height = qs['height'];
            if (!height) {
                return global.minHeight;
            }

            if (height.toLowerCase && height.toLowerCase() === 'auto') {
                return 'auto';
            }

            return parseInt(height, 10);
        }, this);

        // used to shrink the dimensions for the preview
        this.previewHeight = ko.computed(function () {
            return getDimensionLength(this.height(), this.isReportLandscape());
        }, this);

        this.positionClass = ko.computed(function () {
            if (this.position() === 'L')
                return 'right';
            if (this.position() === 'R')
                return 'left';
            return null;
        }, this);

        this.hasContent = ko.computed(function () {
            return !!this.content();
        }, this);
    }


    $(function () {

        var editPanel = new ComponentEditPanel(),
            report = new ReportModel(editPanel, global.initialModel, global.canEdit, global.editing),
            $doc = $('div.doc');

        ajaxManager.init($('div#saving'));
        insertManager.init($('div.doc'), '.component');
        moveManager.init($('div.doc'), '.component');
        deleteManager.init($('div.confirmDelete'));

        editPanel.bindToReport(report);

        $('div.tools a[data-type]')
            .on('click', function (e) {
                var $this = $(this),
                    componentType = $this.attr('data-type'),
                    componentSubType = $this.attr('data-subtype');

                report.createComponent(componentType, componentSubType);

                e.preventDefault();
                e.stopPropagation();
            })
            .on('mouseenter', function () {
                $doc.addClass('adding');
            })
            .on('mouseleave', function () {
                $doc.removeClass('adding');
            });

        $(document).on('mouseup', function () {
            report.endMoveComponent();
        });

        $('#authorityArea').on('change', function () {
            esd.core.redirect({ oa: this.value, pa: null, a: null });
        });
        $('#areaGroup').on('change', function () {
            esd.core.redirect({ oa: $('#authorityArea').val(), pa: this.value, a: null });
        });
        $('#childArea').on('change', function () {
            esd.core.redirect({ oa: $('#authorityArea').val(), pa: $('#areaGroup').val(), a: this.value });
        });

        ko.applyBindings(report);

        if (report.isNew()) {
            report.edit();
        }

        var progressBar_pdf = new ProgressBar($('#progress_pdf'));
        var progressBar_rtf = new ProgressBar($('#progress_rtf'));
        dataLoader.on('add', function () {
            progressBar_rtf.increaseMax();
            progressBar_pdf.increaseMax();
        }).on('executed', function () {
            progressBar_rtf.increase();
            progressBar_pdf.increase();
        }).on('done', function () {
            //progressBar.fadeOut(200);
        });

        report.fetchData(true);

        // some hacks to expose some functionality to the child frame
        window.disableSaveCancel = function() {
            report.disableSaveCancel();
        };
        window.enableSaveCancel = function() {
            report.enableSaveCancel();
        };
    });


    return r;
} (esd.reports || {}));