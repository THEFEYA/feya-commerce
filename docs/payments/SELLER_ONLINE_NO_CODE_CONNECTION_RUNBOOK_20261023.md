# TheFEYA → Seller Online: подключение сотрудником без разработки

Дата проверки: 23 октября 2026. Сайт: https://thefeya.com (Next.js / Vercel / Supabase).
Заявки Seller Online: #738609, #264386, #745282.

## 1. Что УЖЕ работает в нашей системе

- Закрытая панель подключения на основном домене `https://thefeya.com/partner/seller-online`.
- Владелец создаёт 14-дневную ссылку для сотрудника в `https://thefeya.com/admin/payments` → «Создать ссылку на 14 дней». Её нельзя обрезать до `#access=`; нужен адрес целиком.
- Два режима: **PayPal Checkout (REST)** и резервный **PayPal Standard**.
- Сохранение параметров в Supabase Vault; REST: OAuth app credentials → создание НЕОПЛАЧЕННОГО PayPal order с получателем → автоматическая регистрация webhook → реальный тест EUR 1 → верификация подтверждения.
- Автоматический серверный расчёт цены, отдельные защищённые заказы/платежи и идемпотентная обработка сигналов (без настоящего Seller Online платежа результаты проверены на искусственном PayPal).
- Фактически на 23 октября ни PayPal Client ID/Secret, ни получатель, ни персональный ключ магазина не введены, реальных платежей нет. `/api/checkout/status` = `storage_ready:true, checkout_active:false`. Это НЕ полностью активированный приём денег.

## 2. Действия сотрудника Seller Online (никакого программирования)

**Шаг 1.** Открыть выданную владельцем персональную ссылку `/partner/seller-online#access=...`. Не нужны GitHub, Supabase, Vercel. При необходимости владелец может предоставить TeamViewer только для открытия браузера/панели. Обычная админка `/admin` не требуется.

**Шаг 2.** Попробовать **PayPal Checkout (REST)**, если у Seller Online есть PayPal REST Live-приложение, которое может принимать платежи на ИХ же PayPal-аккаунт. Ввести:
- Live Client ID и Client Secret **собственного приложения платёжного аккаунта Seller Online** (они знают, где его взять).
- PayPal email получателя **Seller Online**, не владельца TheFEYA.
- Персональный ключ **нашего магазина** из кабинета Seller Online: https://my.seller-online.com/personal_link.php (раздел данных для CMS / персональных магазинов). Этот ключ идентифицирует TheFEYA; его не придумывают.
- Live → «Сохранить и проверить». Сайт проверит OAuth и возможность создать НЕОПЛАЧЕННЫЙ тестовый заказ с целевым получателем, зарегистрирует webhook. **Это ещё не означает, что деньги приняты.**

**Шаг 3.** Только по разрешению на реальное списание нажать «Тестовый платёж €1», оплатить на официальном PayPal, дождаться статуса **Paid**. Затем лично проверить в кабинете Seller Online, что платёж действительно появился **и зачислен магазину TheFEYA**, а не только попал на общий счёт PayPal. Сообщить владельцу результат и любые технические коды ошибок без передачи секретов.

**Если в REST отказ:** PayPal `NOT_AUTHORIZED` / `PAYEE_NOT_CONSENTED` / подобная ошибка означает, что конкретное приложение не имеет прав платежей за указанного получателя. MCP/agent skill/TeamViewer эти права не создают. Сотрудник должен использовать REST app самого получателя или официальную авторизацию с необходимыми правами.

**Вариант B (только с разрешения Seller Online):** PayPal Standard — ввести только **PayPal email получателя** и **персональный ключ TheFEYA**, API Client ID и Secret НЕ нужны. Кнопка создаёт официальный PayPal hosted redirect с `invoice=FEYA-...`, `custom=FEYA-...;opencart:<KEY>`, `notify_url=https://thefeya.com/api/commerce/paypal/ipn`. Этот формат идентификации взят из схемы OpenCart Seller Online, **но не подтверждён ими для кастомного Next.js**. PayPal Standard устаревает (PayPal/WooCommerce). Нельзя считать канал рабочим без успешного платежа и появления записи в кабинете Seller Online.

**Если не подходит ни A, ни B:** специалисту НЕ надо писать код. Нужен ОДИН документированный разрешённый платёжный протокол Seller Online для custom-store: получение checkout/payment session URL, URL успешного/ошибочного возврата, подтверждение webhook/status, способ идентификации магазина и разрешения/ключ доступа. Тогда код интеграции реализуем на стороне TheFEYA. **API v2 для посылок без платежных endpoints — недостаточен.**

## 3. Важные разъяснения

- Официальный `paypal/AI-Toolkit` (skills и MCP) улучшает код и тестирование **Sandbox**. Не устанавливает платёжный аккаунт Seller Online на сайт и не заменяет разрешения.
- Composio PayPal MCP — S2S OAuth доступ для AI-агента к PayPal API. Также требует действующего PayPal API account. Не является автоматически работоспособным покупательским checkout.
- Stripe skills/Connect относятся к Stripe и не превращают PayPal-аккаунт Seller Online в Stripe-получателя. Пока требование — получение денег Seller Online через PayPal, добавлять Stripe не нужно.
- PayPal Partner Referrals / официальный вход прямо на PayPal реализован в PR #202, **но нужен одобренный partner app**. Пока его нет, это не первичный рабочий путь.
- В Shopify у Seller Online есть собственное приложение и готовый PayPal flow. На Next.js такого приложения нет. Поэтому нельзя обещать ровно тот же интерфейс — однако REST Checkout с ключами своего PayPal получателя не требует перехода на Shopify, если Seller Online разрешает его применение.
- `/admin/payments` и `/partner/seller-online` НЕ программируют сайт: специалист только подтверждает аккаунт и проводит платёж. Не отправляйте открытый пароль или API credentials через ChatGPT, GitHub issue или Telegram.
- Переход платежей покупателей в Live дополнительно заблокирован до согласования финальных цен, доставки, контрактной стороны, налоговых правил: переменная `FEYA_COMMERCE_PAID_CHECKOUT_RELEASE_APPROVED` отдельно от подключённого PayPal. Даже удачный тест EUR 1 не включает checkout автоматически.

## 4. Критерий готовности

Установлен и проверен получатель Seller Online; реальный Live-платёж EUR 1 подтверждён самим PayPal; его можно однозначно найти в кабинете Seller Online и связать с TheFEYA; статус заказа соответствует реальному списанию; итоговая серверная сумма заказа/продажи и юридические условия утверждены до включения покупателей.

### Первоисточники

- https://github.com/paypal/AI-Toolkit
- https://developer.paypal.com/v5/checkout/pay-another-account
- https://developer.paypal.com/api/make-api-requests
- https://developer.woocommerce.com/2026/06/24/sunsetting-paypal-standard/
- https://seller-online.com/help/integraciya-z-cms/
- https://seller-online.com/help/prijom-platezhiv-z-shopify/
- https://seller-online.com/help/api-dokumentaciya-2/
