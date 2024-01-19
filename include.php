<?

use Bitrix\Main\Loader;

CJSCore::RegisterExt('welpodron.basket', [
    'js' => '/local/packages/welpodron.basket/iife/basket/index.js',
    'skip_core' => true,
    'rel' => ['welpodron.core.templater'],
]);

//! ОБЯЗАТЕЛЬНО 

Loader::registerAutoLoadClasses(
    'welpodron.basket',
    [
        'Welpodron\Basket\Utils' => 'lib/utils/utils.php',
    ]
);
