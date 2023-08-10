(() => {
  if ((window as any).welpodron && (window as any).welpodron.templater) {
    if ((window as any).welpodron.basket) {
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

    type _BitrixResponse = {
      data: any;
      status: "success" | "error";
      errors: {
        code: string;
        message: string;
        customData: string;
      }[];
    };

    type BasketConfigType = {};

    type BasketPropsType = {
      sessid: string;
      config?: BasketConfigType;
    };

    class Basket {
      sessid = "";

      supportedActions = ["add"];

      constructor({ sessid, config = {} }: BasketPropsType) {
        if ((Basket as any).instance) {
          (Basket as any).instance.sessid = sessid;
          return (Basket as any).instance;
        }

        this.setSessid(sessid);

        document.removeEventListener("click", this.handleDocumentClick);
        document.addEventListener("click", this.handleDocumentClick);

        (Basket as any).instance = this;
      }

      handleDocumentClick = (event: MouseEvent) => {
        let { target } = event;

        if (!target) {
          return;
        }

        target = (target as Element).closest(
          `[${ATTRIBUTE_CONTROL}][${ATTRIBUTE_ACTION}]`
        );

        if (!target) {
          return;
        }

        const action = (target as Element).getAttribute(
          ATTRIBUTE_ACTION
        ) as keyof this;

        const actionArgs = (target as Element).getAttribute(
          ATTRIBUTE_ACTION_ARGS
        );

        if (!actionArgs) {
          return;
        }

        const actionFlush = (target as Element).getAttribute(
          ATTRIBUTE_ACTION_FLUSH
        );

        if (!actionFlush) {
          event.preventDefault();
        }

        if (!action || !this.supportedActions.includes(action as string)) {
          return;
        }

        const actionFunc = this[action] as any;

        if (actionFunc instanceof Function) {
          return actionFunc({
            args: actionArgs,
            event,
          });
        }
      };

      setSessid = (sessid: string) => {
        this.sessid = sessid;
      };

      add = async ({ args, event }: { args?: unknown; event?: Event }) => {
        if (!args) {
          return;
        }

        const controls = document.querySelectorAll(
          `[${ATTRIBUTE_CONTROL}][${ATTRIBUTE_ACTION}][${ATTRIBUTE_ACTION_ARGS}="${args}"]`
        );

        controls.forEach((control) => {
          control.setAttribute("disabled", "");
        });

        const data = new FormData();

        data.set("sessid", this.sessid);
        data.set("args", args as any);

        let dispatchedEvent = new CustomEvent(EVENT_ADD_BEFORE, {
          bubbles: true,
          cancelable: false,
        });

        document.dispatchEvent(dispatchedEvent);

        let responseData: any = {};

        try {
          const response = await fetch(
            "/bitrix/services/main/ajax.php?action=welpodron%3Abasket.Receiver.add",
            {
              method: "POST",
              body: data,
            }
          );

          if (!response.ok) {
            throw new Error(response.statusText);
          }

          const bitrixResponse: _BitrixResponse = await response.json();

          if (bitrixResponse.status === "error") {
            console.error(bitrixResponse);

            const error = bitrixResponse.errors[0];

            if (!event || !event?.target) {
              return;
            }

            const target = (event.target as Element).closest(
              `[${ATTRIBUTE_CONTROL}][${ATTRIBUTE_ACTION}]`
            );

            if (!target || !target.parentElement) {
              return;
            }

            let div = target.parentElement.querySelector(
              `[${ATTRIBUTE_RESPONSE}]`
            );

            if (!div) {
              div = document.createElement("div");
              div.setAttribute(ATTRIBUTE_RESPONSE, "");
              target.parentElement.appendChild(div);
            }

            (window as any).welpodron.templater.renderHTML({
              string: error.message,
              container: div as HTMLElement,
              config: {
                replace: true,
              },
            });
          } else {
            responseData = bitrixResponse.data;

            if (responseData.HTML != null) {
              if (event && event?.target) {
                const target = (event.target as Element).closest(
                  `[${ATTRIBUTE_CONTROL}][${ATTRIBUTE_ACTION}]`
                );

                if (target && target.parentElement) {
                  let div = target.parentElement.querySelector(
                    `[${ATTRIBUTE_RESPONSE}]`
                  );

                  if (!div) {
                    div = document.createElement("div");
                    div.setAttribute(ATTRIBUTE_RESPONSE, "");
                    target.parentElement.appendChild(div);
                  }

                  (window as any).welpodron.templater.renderHTML({
                    string: responseData.HTML,
                    container: div as HTMLElement,
                    config: {
                      replace: true,
                    },
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(error);
        } finally {
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

    (window as any).welpodron.basket = Basket;
  }
})();
