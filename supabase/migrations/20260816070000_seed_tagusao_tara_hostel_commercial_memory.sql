-- Real commercial history transcribed from three Tagusao Construction & Trading Inc. purchase orders.
-- Source: user-provided photographs. These are CLIENT PURCHASE ORDERS, not Azarraga invoices.
-- Historical prices are evidence only and must never be treated as current quote authority.

DO $$
DECLARE
  v_customer uuid;
  v_project uuid;
  v_doc_90643 uuid;
  v_doc_90826 uuid;
  v_doc_90973 uuid;
  v_po_90643 uuid;
  v_po_90826 uuid;
  v_po_90973 uuid;
BEGIN
  SELECT id INTO v_customer FROM public.customers
  WHERE lower(name)=lower('Tagusao Construction and Trading Inc.') OR lower(company)=lower('Tagusao Construction and Trading Inc.')
  ORDER BY created_at LIMIT 1;

  IF v_customer IS NULL THEN
    INSERT INTO public.customers(name,company,billing_address,tin,notes)
    VALUES(
      'Tagusao Construction and Trading Inc.',
      'Tagusao Construction and Trading Inc.',
      'VRC Rizal Ave. Ext., Bancao Bancao, Puerto Princesa City, Palawan',
      '009-224-724-000',
      'Confirmed customer from Tagusao P.O. forms. Azarraga Glass & Aluminum is the supplier/vendor.'
    ) RETURNING id INTO v_customer;
  ELSE
    UPDATE public.customers SET
      company='Tagusao Construction and Trading Inc.',
      billing_address='VRC Rizal Ave. Ext., Bancao Bancao, Puerto Princesa City, Palawan',
      tin='009-224-724-000',
      notes=COALESCE(notes,'') || E'\nConfirmed from Tagusao P.O. forms; Azarraga is supplier/vendor.'
    WHERE id=v_customer;
  END IF;

  SELECT id INTO v_project FROM public.projects
  WHERE customer_id=v_customer AND lower(name)=lower('Tara Hostel - El Nido')
  ORDER BY created_at LIMIT 1;
  IF v_project IS NULL THEN
    INSERT INTO public.projects(customer_id,name,location,status,notes)
    VALUES(v_customer,'Tara Hostel - El Nido','El Nido, Palawan','ACTIVE','Project/class printed as TARA HOSTEL ELNIDO on Tagusao purchase orders.')
    RETURNING id INTO v_project;
  END IF;

  -- PO 90643 / 12 March 2026
  SELECT id INTO v_doc_90643 FROM public.source_documents WHERE reference='TAGUSAO-PO-90643' LIMIT 1;
  IF v_doc_90643 IS NULL THEN
    INSERT INTO public.source_documents(doc_type,reference,customer_id,project_id,customer_name,project_name,location,doc_date,ingestion_status,extracted,missing_information,conflicts,human_review_required,notes)
    VALUES(
      'purchase_order','TAGUSAO-PO-90643',v_customer,v_project,'Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','2026-03-12','INGESTED',
      jsonb_build_object(
        'po_number','90643','mrs_number','TCAT01053','terms','Net','expected_date','2026-03-12',
        'supplier','Azarraga Glass & Aluminum','buyer','Tagusao Construction and Trading Inc.',
        'deliver_and_invoice_to','VRC Rizal Ave. Ext., Bancao Bancao, Puerto Princesa City, Palawan',
        'buyer_tin','009-224-724-000','class','TARA HOSTEL ELNIDO','memo','FOR SLIDING DOORS AND WINDOWS',
        'subtotal_before_services_discount_centavos',63542500,'services_centavos',5400000,'discount_centavos',-442500,'total_centavos',68500000,
        'source_kind','photograph_of_original_po','document_interpretation','Client purchase order received by Azarraga; not an Azarraga-issued invoice.'
      ),'[]'::jsonb,'[]'::jsonb,false,
      'Confirmed from uploaded PO photograph. Unit prices include historical commercial evidence only.'
    ) RETURNING id INTO v_doc_90643;
  END IF;

  SELECT id INTO v_po_90643 FROM public.purchase_orders WHERE po_number='90643' AND customer_id=v_customer LIMIT 1;
  IF v_po_90643 IS NULL THEN
    INSERT INTO public.purchase_orders(po_number,customer_id,project_id,po_date,currency,total_centavos,terms,status,source_document_id,comparison)
    VALUES('90643',v_customer,v_project,'2026-03-12','PHP',68500000,'Net','RECEIVED',v_doc_90643,jsonb_build_object('mrs_number','TCAT01053','expected_date','2026-03-12','memo','FOR SLIDING DOORS AND WINDOWS'))
    RETURNING id INTO v_po_90643;

    INSERT INTO public.purchase_order_lines(purchase_order_id,line_no,description,quantity,unit,unit_price_centavos,amount_centavos) VALUES
      (v_po_90643,1,'(SD4) 900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.938 x 2.700 m',1,'SET',3087500,3087500),
      (v_po_90643,2,'(SD5) 900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.987 x 2.700 m',1,'SET',3087500,3087500),
      (v_po_90643,3,'(SD6) 900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.994 x 2.700 m',1,'SET',3087500,3087500),
      (v_po_90643,4,'(SD7) 900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 3.006 x 2.700 m',1,'SET',3087500,3087500),
      (v_po_90643,5,'(SD8) 900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.975 x 2.700 m',1,'SET',3087500,3087500),
      (v_po_90643,6,'(SD9) 900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 3.025 x 2.700 m',1,'SET',3087500,3087500),
      (v_po_90643,7,'(SD10) 900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 3.597 x 2.700 m',1,'SET',3874000,3874000),
      (v_po_90643,8,'(SD11) 900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 3.808 x 2.700 m',1,'SET',4093500,4093500),
      (v_po_90643,9,'(SD12) 900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.975 x 2.700 m',12,'SET',3087500,37050000),
      (v_po_90643,10,'CRATING, SHIPPING, TRUCKING & INSTALLATION COST',1,'LOT',5400000,5400000),
      (v_po_90643,11,'PURCHASE DISCOUNTS',1,'LOT',-442500,-442500);
  END IF;

  -- Commercial evidence from PO 90643. One row per priced product configuration.
  IF NOT EXISTS (SELECT 1 FROM public.commercial_evidence WHERE source_reference='TAGUSAO-PO-90643') THEN
    INSERT INTO public.commercial_evidence(customer_name,project_name,location,product_family,system,configuration,glass,frame_color,width_mm,height_mm,quantity,historical_unit_price_centavos,historical_line_amount_centavos,currency,included_services,pricing_type,source_reference,source_date,source_document_id,evidence_kind,confidence,human_review_required,raw) VALUES
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD4','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2938,2700,1,3087500,3087500,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90643','2026-03-12',v_doc_90643,'FACT',1,false,jsonb_build_object('po','90643')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD5','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2987,2700,1,3087500,3087500,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90643','2026-03-12',v_doc_90643,'FACT',1,false,jsonb_build_object('po','90643')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD6','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2994,2700,1,3087500,3087500,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90643','2026-03-12',v_doc_90643,'FACT',1,false,jsonb_build_object('po','90643')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD7','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',3006,2700,1,3087500,3087500,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90643','2026-03-12',v_doc_90643,'FACT',1,false,jsonb_build_object('po','90643')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD8','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2975,2700,1,3087500,3087500,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90643','2026-03-12',v_doc_90643,'FACT',1,false,jsonb_build_object('po','90643')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD9','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',3025,2700,1,3087500,3087500,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90643','2026-03-12',v_doc_90643,'FACT',1,false,jsonb_build_object('po','90643')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD10','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',3597,2700,1,3874000,3874000,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90643','2026-03-12',v_doc_90643,'FACT',1,false,jsonb_build_object('po','90643')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD11','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',3808,2700,1,4093500,4093500,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90643','2026-03-12',v_doc_90643,'FACT',1,false,jsonb_build_object('po','90643')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD12','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2975,2700,12,3087500,37050000,'PHP',jsonb_build_array('crating','shipping','trucking','installation'),'HISTORICAL_EVIDENCE','TAGUSAO-PO-90643','2026-03-12',v_doc_90643,'FACT',1,false,jsonb_build_object('po','90643','service_lot_centavos',5400000,'purchase_discount_centavos',-442500));
  END IF;

  -- PO 90826 / 31 March 2026
  SELECT id INTO v_doc_90826 FROM public.source_documents WHERE reference='TAGUSAO-PO-90826' LIMIT 1;
  IF v_doc_90826 IS NULL THEN
    INSERT INTO public.source_documents(doc_type,reference,customer_id,project_id,customer_name,project_name,location,doc_date,ingestion_status,extracted,missing_information,conflicts,human_review_required,notes)
    VALUES('purchase_order','TAGUSAO-PO-90826',v_customer,v_project,'Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','2026-03-31','INGESTED',
      jsonb_build_object('po_number','90826','mrs_number','TCAT02086','terms','Net','expected_date','2026-03-31','supplier','Azarraga Glass & Aluminum','buyer','Tagusao Construction and Trading Inc.','buyer_tin','009-224-724-000','memo','FOR GF OFFICES DOOR','product_amount_centavos',2400000,'crating_shipping_delivery_centavos',400000,'total_centavos',2800000,'source_kind','photograph_of_original_po','document_interpretation','Client purchase order received by Azarraga; not an Azarraga-issued invoice.'),
      '[]'::jsonb,'[]'::jsonb,false,'Confirmed from uploaded PO photograph.') RETURNING id INTO v_doc_90826;
  END IF;

  SELECT id INTO v_po_90826 FROM public.purchase_orders WHERE po_number='90826' AND customer_id=v_customer LIMIT 1;
  IF v_po_90826 IS NULL THEN
    INSERT INTO public.purchase_orders(po_number,customer_id,project_id,po_date,currency,total_centavos,terms,status,source_document_id,comparison)
    VALUES('90826',v_customer,v_project,'2026-03-31','PHP',2800000,'Net','RECEIVED',v_doc_90826,jsonb_build_object('mrs_number','TCAT02086','expected_date','2026-03-31','memo','FOR GF OFFICES DOOR')) RETURNING id INTO v_po_90826;
    INSERT INTO public.purchase_order_lines(purchase_order_id,line_no,description,quantity,unit,unit_price_centavos,amount_centavos) VALUES
      (v_po_90826,1,'D5 SUPPLY INSTALLATION OF 12MM CLEAR TEMPERED FRAMELESS GLASS SWING DOOR WITH FROSTED FILM COMPLETE WITH HEAVY DUTY HINGES, STAINLESS STEEL LOCKSET AND STAINLESS STEEL HANDLE (0.90 x 2.40 m)',1,'SET',2400000,2400000),
      (v_po_90826,2,'CRATING / SHIPPING / DELIVERY',1,'LOT',400000,400000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.commercial_evidence WHERE source_reference='TAGUSAO-PO-90826') THEN
    INSERT INTO public.commercial_evidence(customer_name,project_name,location,product_family,system,configuration,glass,frame_color,width_mm,height_mm,quantity,historical_unit_price_centavos,historical_line_amount_centavos,currency,included_services,pricing_type,source_reference,source_date,source_document_id,evidence_kind,confidence,human_review_required,raw)
    VALUES('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Swing Door','Frameless',jsonb_build_object('opening','D5','layout','single swing','film','frosted','hardware',jsonb_build_array('heavy duty hinges','stainless steel lockset','stainless steel handle')),jsonb_build_object('type','tempered clear','thickness_mm',12),NULL,900,2400,1,2400000,2400000,'PHP',jsonb_build_array('supply','installation','crating','shipping','delivery'),'HISTORICAL_EVIDENCE','TAGUSAO-PO-90826','2026-03-31',v_doc_90826,'FACT',1,false,jsonb_build_object('po','90826','separate_logistics_centavos',400000));
  END IF;

  -- PO 90973 / 23 April 2026
  SELECT id INTO v_doc_90973 FROM public.source_documents WHERE reference='TAGUSAO-PO-90973' LIMIT 1;
  IF v_doc_90973 IS NULL THEN
    INSERT INTO public.source_documents(doc_type,reference,customer_id,project_id,customer_name,project_name,location,doc_date,ingestion_status,extracted,missing_information,conflicts,human_review_required,notes)
    VALUES('purchase_order','TAGUSAO-PO-90973',v_customer,v_project,'Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','2026-04-23','INGESTED',
      jsonb_build_object('po_number','90973','mrs_number','TCAT04001','terms','Net','expected_date','2026-04-23','supplier','Azarraga Glass & Aluminum','supplier_address','5300 South National Highway, San Pedro, Puerto Princesa City','buyer','Tagusao Construction and Trading Inc.','buyer_tin','009-224-724-000','memo','FOR GROUND FLOOR & 2ND FLOOR','product_amount_before_services_discount_centavos',84776500,'crating_shipping_trucking_installation_centavos',7500000,'purchase_discount_centavos',-1776500,'total_centavos',90500000,'source_kind','photograph_of_original_po','document_interpretation','Client purchase order received by Azarraga; not an Azarraga-issued invoice.'),
      '[]'::jsonb,'[]'::jsonb,false,'Confirmed from uploaded PO photograph. Supplier address is explicitly printed on this PO.') RETURNING id INTO v_doc_90973;
  END IF;

  SELECT id INTO v_po_90973 FROM public.purchase_orders WHERE po_number='90973' AND customer_id=v_customer LIMIT 1;
  IF v_po_90973 IS NULL THEN
    INSERT INTO public.purchase_orders(po_number,customer_id,project_id,po_date,currency,total_centavos,terms,status,source_document_id,comparison)
    VALUES('90973',v_customer,v_project,'2026-04-23','PHP',90500000,'Net','RECEIVED',v_doc_90973,jsonb_build_object('mrs_number','TCAT04001','expected_date','2026-04-23','memo','FOR GROUND FLOOR & 2ND FLOOR')) RETURNING id INTO v_po_90973;
    INSERT INTO public.purchase_order_lines(purchase_order_id,line_no,description,quantity,unit,unit_price_centavos,amount_centavos) VALUES
      (v_po_90973,1,'FIXED W/ POCKET SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 4.072 x 2.700 m',1,'SET',4832000,4832000),
      (v_po_90973,2,'FIXED W/ POCKET SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 4.097 x 2.700 m',1,'SET',5111000,5111000),
      (v_po_90973,3,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 3.600 x 2.700 m (SD3)',1,'SET',4520500,4520500),
      (v_po_90973,4,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.938 x 2.700 m (SD4)',1,'SET',3430400,3430400),
      (v_po_90973,5,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.987 x 2.700 m (SD5)',1,'SET',3430400,3430400),
      (v_po_90973,6,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.994 x 2.700 m (SD6)',1,'SET',3430400,3430400),
      (v_po_90973,7,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 3.006 x 2.700 m (SD7)',1,'SET',3430400,3430400),
      (v_po_90973,8,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.975 x 2.700 m (SD8)',1,'SET',3430400,3430400),
      (v_po_90973,9,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 3.025 x 2.700 m (SD9)',1,'SET',3430400,3430400),
      (v_po_90973,10,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 3.597 x 2.700 m (SD10)',1,'SET',4172300,4172300),
      (v_po_90973,11,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 3.808 x 2.700 m (SD11)',1,'SET',4393500,4393500),
      (v_po_90973,12,'900 SERIES FIXED-SLIDE-SLIDE DOOR, BLACK FRAME, 10mm TEMPERED CLEAR, 2.975 x 2.700 m (SD12)',12,'SET',3430400,41164800),
      (v_po_90973,13,'CRATING, SHIPPING, TRUCKING & INSTALLATION COST',1,'LOT',7500000,7500000),
      (v_po_90973,14,'PURCHASE DISCOUNTS',1,'LOT',-1776500,-1776500);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.commercial_evidence WHERE source_reference='TAGUSAO-PO-90973') THEN
    INSERT INTO public.commercial_evidence(customer_name,project_name,location,product_family,system,configuration,glass,frame_color,width_mm,height_mm,quantity,historical_unit_price_centavos,historical_line_amount_centavos,currency,included_services,pricing_type,source_reference,source_date,source_document_id,evidence_kind,confidence,human_review_required,raw) VALUES
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Pocket Sliding Door','Pocket Slide',jsonb_build_object('layout','fixed with pocket slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',4072,2700,1,4832000,4832000,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Pocket Sliding Door','Pocket Slide',jsonb_build_object('layout','fixed with pocket slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',4097,2700,1,5111000,5111000,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD3','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',3600,2700,1,4520500,4520500,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD4','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2938,2700,1,3430400,3430400,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD5','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2987,2700,1,3430400,3430400,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD6','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2994,2700,1,3430400,3430400,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD7','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',3006,2700,1,3430400,3430400,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD8','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2975,2700,1,3430400,3430400,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD9','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',3025,2700,1,3430400,3430400,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD10','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',3597,2700,1,4172300,4172300,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD11','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',3808,2700,1,4393500,4393500,'PHP','[]','HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973')),
      ('Tagusao Construction and Trading Inc.','Tara Hostel - El Nido','El Nido, Palawan','Sliding Door','900 Series',jsonb_build_object('opening','SD12','layout','fixed-slide-slide'),jsonb_build_object('type','tempered clear','thickness_mm',10),'Black',2975,2700,12,3430400,41164800,'PHP',jsonb_build_array('crating','shipping','trucking','installation'),'HISTORICAL_EVIDENCE','TAGUSAO-PO-90973','2026-04-23',v_doc_90973,'FACT',1,false,jsonb_build_object('po','90973','service_lot_centavos',7500000,'purchase_discount_centavos',-1776500));
  END IF;

  -- Materialized purchase history used by customer/project views and future pricing analysis.
  INSERT INTO public.items_purchased(customer_id,project_id,purchase_order_id,product_family,system,description,glass,frame_color,width_mm,height_mm,quantity,unit_price_centavos,currency,purchased_on,source_reference,source_document_id)
  SELECT v_customer,v_project,po.id,e.product_family,e.system,
         concat_ws(' · ',e.product_family,e.system,e.configuration->>'opening'),
         concat_ws(' ',e.glass->>'thickness_mm','mm',e.glass->>'type'),e.frame_color,e.width_mm,e.height_mm,e.quantity,e.historical_unit_price_centavos,e.currency,e.source_date,e.source_reference,e.source_document_id
  FROM public.commercial_evidence e
  JOIN public.purchase_orders po ON po.source_document_id=e.source_document_id
  WHERE e.source_reference IN ('TAGUSAO-PO-90643','TAGUSAO-PO-90826','TAGUSAO-PO-90973')
    AND NOT EXISTS (SELECT 1 FROM public.items_purchased ip WHERE ip.source_document_id=e.source_document_id AND ip.width_mm IS NOT DISTINCT FROM e.width_mm AND ip.height_mm IS NOT DISTINCT FROM e.height_mm AND ip.unit_price_centavos IS NOT DISTINCT FROM e.historical_unit_price_centavos AND ip.quantity IS NOT DISTINCT FROM e.quantity);
END $$;
