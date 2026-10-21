-- State as left by the earlier (non-functional) Seller Online setup panel.
update public.feya_seller_online_payment_setup_v1 set
  integration_mode='paypal_standard',
  paypal_email_vault_id=vault.create_secret('Legacy@Seller-Online.example','legacy_email',''),
  personal_key_vault_id=vault.create_secret('aaaaaaaabbbbbbbbccccccccdddddddd','legacy_key','')
where id=1;
insert into public.feya_seller_online_setup_grants_v1(token_sha256,expires_at)
values(encode(sha256(convert_to('legacy-token','UTF8')),'hex'),now()+interval '2 days');
