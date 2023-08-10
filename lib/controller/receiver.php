<?

namespace Welpodron\Basket\Controller;

use Bitrix\Main\Engine\Controller;
use Bitrix\Main\Error;
use Bitrix\Main\Loader;
use Bitrix\Main\Context;
use Bitrix\Sale\Basket;
use Bitrix\Sale\Fuser;
use Bitrix\Catalog\Product\Basket as _Basket;
use Bitrix\Main\Engine\ActionFilter;
use Bitrix\Main\Engine\CurrentUser;
use Welpodron\Basket\Utils;
use Bitrix\Main\Config\Option;

// welpodron:basket.Receiver.add

class Receiver extends Controller
{
    const DEFAULT_MODULE_ID = 'welpodron.basket';
    const DEFAULT_ERROR_CONTENT = "При обработке Вашего запроса произошла ошибка, повторите попытку позже или свяжитесь с администрацией сайта";


    public function configureActions()
    {
        return [
            'add' => [
                'prefilters' => [],
            ],
        ];
    }

    public function addAction()
    {
        global $APPLICATION;

        try {
            if (!Loader::includeModule(self::DEFAULT_MODULE_ID)) {
                throw new \Exception('Модуль ' . self::DEFAULT_MODULE_ID . ' не удалось подключить');
            }

            if (!Loader::includeModule("catalog")) {
                throw new \Exception('Модуль catalog не удалось подключить');
            }

            if (!Loader::includeModule("sale")) {
                throw new \Exception('Модуль sale не удалось подключить');
            }

            if (!_Basket::isNotCrawler()) {
                throw new \Exception('Поисковые роботы не могут добавлять товары в корзину');
            }

            $request = $this->getRequest();
            $arDataRaw = $request->getPostList()->toArray();

            // Данные должны содержать идентификатор сессии битрикса 
            if ($arDataRaw['sessid'] !== bitrix_sessid()) {
                throw new \Exception('Неверный идентификатор сессии');
            }

            $id = intval($arDataRaw['args']);

            if ($id <= 0) {
                throw new \Exception('Неверный ID');
            }

            $quantity = 1;

            $siteId = Context::getCurrent()->getSite();

            //! TODO: тут есть опция skip_create
            $userId = Fuser::getId();

            $basket = Basket::loadItemsForFUser($userId, $siteId);

            if ($item = $basket->getExistsItems('catalog', $id)[0]) {
                $item->setField('QUANTITY', $item->getQuantity() + $quantity);
            } else {
                $item = $basket->createItem('catalog', $id);

                $item->setFields([
                    'QUANTITY' => $quantity,
                    'LID' => $siteId,
                    'PRODUCT_PROVIDER_CLASS' => '\Bitrix\Catalog\Product\CatalogProvider',
                ]);
            }

            $result = $basket->save();

            if (!$result->isSuccess()) {
                throw new \Exception(implode(', ', $result->getErrorMessages()));
            }

            $basketCounter = Utils::getCounter($basket);

            $arResult = [
                'PRODUCT_ID' => $id,
                'IN_BASKET' => true,
                'BASKET_COUNTER' => $basketCounter,
            ];

            $useSuccessContent = Option::get(self::DEFAULT_MODULE_ID, 'USE_SUCCESS_CONTENT');

            if ($useSuccessContent == 'Y') {
                $templateIncludeResult =  Option::get(self::DEFAULT_MODULE_ID, 'SUCCESS_CONTENT_DEFAULT');

                $successFile = Option::get(self::DEFAULT_MODULE_ID, 'SUCCESS_FILE');

                if ($successFile) {
                    ob_start();
                    $APPLICATION->IncludeFile($successFile, [
                        'arMutation' => [
                            'PATH' => $successFile,
                            'PARAMS' => $arResult,
                        ]
                    ], ["SHOW_BORDER" => false, "MODE" => "php"]);
                    $templateIncludeResult = ob_get_contents();
                    ob_end_clean();
                }

                $arResult['HTML'] = $templateIncludeResult;
            }

            return $arResult;
        } catch (\Throwable $th) {
            if (CurrentUser::get()->isAdmin()) {
                $this->addError(new Error($th->getMessage(), $th->getCode()));
                return;
            }

            try {
                $useErrorContent = Option::get(self::DEFAULT_MODULE_ID, 'USE_ERROR_CONTENT');

                if ($useErrorContent == 'Y') {
                    $errorFile = Option::get(self::DEFAULT_MODULE_ID, 'ERROR_FILE');

                    if (!$errorFile) {
                        $this->addError(new Error(Option::get(self::DEFAULT_MODULE_ID, 'ERROR_CONTENT_DEFAULT')));
                        return;
                    }

                    ob_start();
                    $APPLICATION->IncludeFile($errorFile, [
                        'arMutation' => [
                            'PATH' => $errorFile,
                            'PARAMS' => [],
                        ]
                    ], ["SHOW_BORDER" => false, "MODE" => "php"]);
                    $templateIncludeResult = ob_get_contents();
                    ob_end_clean();
                    $this->addError(new Error($templateIncludeResult));
                    return;
                }

                $this->addError(new Error(self::DEFAULT_ERROR_CONTENT));
                return;
            } catch (\Throwable $th) {
                if (CurrentUser::get()->isAdmin()) {
                    $this->addError(new Error($th->getMessage(), $th->getCode()));
                    return;
                } else {
                    $this->addError(new Error(self::DEFAULT_ERROR_CONTENT));
                    return;
                }
            }
        }
    }
}
