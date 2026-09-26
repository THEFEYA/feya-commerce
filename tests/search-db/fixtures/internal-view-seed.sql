-- Synthetic local evidence only. Never execute against production.
insert into public.feya_commerce_seo_keyword_master_v1(keyword_id,keyword,keyword_norm,keyword_word_count,priority_tier,validation_priority,validation_status,requires_api_validation,active_flag)
values(820,'synthetic review armor','synthetic review armor',3,'tier_1','high','queued',true,true);
insert into public.feya_commerce_seo_keyword_ai_cleanup_v1(cleanup_id,keyword_id,keyword_norm,original_keyword,cleaned_keyword,ai_intent,suggested_page_level,should_use_for_product,should_hold,review_status)
values(820,820,'synthetic review armor','synthetic review armor','synthetic review armor','commercial','product',true,false,'pending');
insert into public.feya_commerce_seo_keyword_cleanup_review_recommendations_v1(recommendation_id,cleanup_id,keyword_norm,review_risk,recommendation,prompt_version,run_id,reason)
values('20000000-0000-4000-8000-000000000020',820,'synthetic review armor','LOW','HOLD','fixture','20000000-0000-4000-8000-000000000021','Synthetic review remains separate from owner approval');
insert into public.feya_commerce_product_drafts(canonical_product_id,source_shop_code,card_title,h1,product_type)
values('20000000-0000-4000-8000-000000000022','fixture','Synthetic review armor','Synthetic review armor','shoulders');
insert into public.feya_commerce_seo_query_clusters_v1(query_cluster_id,cluster_code,cluster_label,normalized_intent,cluster_status)
values('20000000-0000-4000-8000-000000000023','SYNTHETIC_VIEW_CLUSTER','Synthetic review armor','synthetic review armor','approved');
insert into public.feya_commerce_seo_query_cluster_members_v1(query_cluster_id,keyword_norm,member_role)
values('20000000-0000-4000-8000-000000000023','synthetic review armor','seed');
insert into public.feya_commerce_seo_pages_v1(seo_page_id,page_type,url_path,canonical_product_id,market_code,locale,portfolio_status,indexation_intent)
values('20000000-0000-4000-8000-000000000024','product','/shop/synthetic-view-armor','20000000-0000-4000-8000-000000000022','US','en-US','active','candidate');
