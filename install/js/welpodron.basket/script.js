"use strict";
(() => {
    if (window.welpodron && window.welpodron.templater) {
        if (window.welpodron.basket) {
            return;
        }
        const MODULE_BASE = "basket";
        const EVENT_ADD_BEFORE = `welpodron.${MODULE_BASE}:add:before`;
        const EVENT_ADD_AFTER = `welpodron.${MODULE_BASE}:add:after`;
        const ATTRIBUTE_BASE = `data-w-${MODULE_BASE}`;
        const ATTRIBUTE_RESPONSE = `${ATTRIBUTE_BASE}-response`;
        const ATTRIBUTE_CONTROL = `${ATTRIBUTE_BASE}-control`;
        const ATTRIBUTE_ACTION = `${ATTRIBUTE_BASE}-action`;
        const ATTRIBUTE_ACTION_ARGS = `${ATTRIBUTE_ACTION}-args`;
        const ATTRIBUTE_ACTION_FLUSH = `${ATTRIBUTE_ACTION}-flush`;
        class Basket {
            sessid = "";
            supportedActions = ["add"];
            constructor({ sessid, config = {} }) {
                if (Basket.instance) {
                    Basket.instance.sessid = sessid;
                    return Basket.instance;
                }
                this.setSessid(sessid);
                document.removeEventListener("click", this.handleDocumentClick);
                document.addEventListener("click", this.handleDocumentClick);
                Basket.instance = this;
            }
            handleDocumentClick = (event) => {
                let { target } = event;
                if (!target) {
                    return;
                }
                target = target.closest(`[${ATTRIBUTE_CONTROL}][${ATTRIBUTE_ACTION}]`);
                if (!target) {
                    return;
                }
                const action = target.getAttribute(ATTRIBUTE_ACTION);
                const actionArgs = target.getAttribute(ATTRIBUTE_ACTION_ARGS);
                if (!actionArgs) {
                    return;
                }
                const actionFlush = target.getAttribute(ATTRIBUTE_ACTION_FLUSH);
                if (!actionFlush) {
                    event.preventDefault();
                }
                if (!action || !this.supportedActions.includes(action)) {
                    return;
                }
                const actionFunc = this[action];
                if (actionFunc instanceof Function) {
                    return actionFunc({
                        args: actionArgs,
                        event,
                    });
                }
            };
            setSessid = (sessid) => {
                this.sessid = sessid;
            };
            add = async ({ args, event }) => {
                if (!args) {
                    return;
                }
                const controls = document.querySelectorAll(`[${ATTRIBUTE_CONTROL}][${ATTRIBUTE_ACTION}][${ATTRIBUTE_ACTION_ARGS}="${args}"]`);
                controls.forEach((control) => {
                    control.setAttribute("disabled", "");
                });
                const data = new FormData();
                data.set("sessid", this.sessid);
                data.set("args", args);
                let dispatchedEvent = new CustomEvent(EVENT_ADD_BEFORE, {
                    bubbles: true,
                    cancelable: false,
                });
                document.dispatchEvent(dispatchedEvent);
                let responseData = {};
                try {
                    const response = await fetch("/bitrix/services/main/ajax.php?action=welpodron%3Abasket.Receiver.add", {
                        method: "POST",
                        body: data,
                    });
                    if (!response.ok) {
                        throw new Error(response.statusText);
                    }
                    const bitrixResponse = await response.json();
                    if (bitrixResponse.status === "error") {
                        console.error(bitrixResponse);
                        const error = bitrixResponse.errors[0];
                        if (!event || !event?.target) {
                            return;
                        }
                        const target = event.target.closest(`[${ATTRIBUTE_CONTROL}][${ATTRIBUTE_ACTION}]`);
                        if (!target || !target.parentElement) {
                            return;
                        }
                        let div = target.parentElement.querySelector(`[${ATTRIBUTE_RESPONSE}]`);
                        if (!div) {
                            div = document.createElement("div");
                            div.setAttribute(ATTRIBUTE_RESPONSE, "");
                            target.parentElement.appendChild(div);
                        }
                        window.welpodron.templater.renderHTML({
                            string: error.message,
                            container: div,
                            config: {
                                replace: true,
                            },
                        });
                    }
                    else {
                        responseData = bitrixResponse.data;
                        if (responseData.HTML != null) {
                            if (event && event?.target) {
                                const target = event.target.closest(`[${ATTRIBUTE_CONTROL}][${ATTRIBUTE_ACTION}]`);
                                if (target && target.parentElement) {
                                    let div = target.parentElement.querySelector(`[${ATTRIBUTE_RESPONSE}]`);
                                    if (!div) {
                                        div = document.createElement("div");
                                        div.setAttribute(ATTRIBUTE_RESPONSE, "");
                                        target.parentElement.appendChild(div);
                                    }
                                    window.welpodron.templater.renderHTML({
                                        string: responseData.HTML,
                                        container: div,
                                        config: {
                                            replace: true,
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    console.error(error);
                }
                finally {
                    dispatchedEvent = new CustomEvent(EVENT_ADD_AFTER, {
                        bubbles: true,
                        cancelable: false,
                        detail: responseData,
                    });
                    document.dispatchEvent(dispatchedEvent);
                    controls.forEach((control) => {
                        control.removeAttribute("disabled");
                    });
                }
            };
        }
        window.welpodron.basket = Basket;
    }
})();
