<?

use Bitrix\Main\Loader;

CJSCore::RegisterExt('welpodron.basket', [
    'js' => '/bitrix/js/welpodron.basket/script.js',
    'skip_core' => true
]);

//! ОБЯЗАТЕЛЬНО 

Loader::registerAutoLoadClasses(
    'welpodron.basket',
    [
        'Welpodron\Basket\Utils' => 'lib/utils/utils.php',
    ]
);
