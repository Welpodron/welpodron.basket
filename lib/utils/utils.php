<?

namespace Welpodron\Basket;

use Bitrix\Sale\Basket as SaleBasket;
use Bitrix\Sale\Fuser;
use Bitrix\Main\Context;

class Utils
{
    static public function getCounter($basket = null)
    {
        if ($basket) {
            return array_sum($basket->getQuantityList());
        }

        $siteId = Context::getCurrent()->getSite();

        //! TODO: тут есть опция skip_create
        $userId = Fuser::getId(true);

        $basket = SaleBasket::loadItemsForFUser($userId, $siteId);

        return array_sum($basket->getQuantityList());
    }
}
