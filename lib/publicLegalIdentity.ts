import 'server-only';

export type PublicLegalIdentity={
  legalName:string;
  brandName:'TheFEYA';
  address:{
    line1:string;
    line2:string|null;
    city:string;
    region:string|null;
    postalCode:string;
    country:string;
  };
  contactEmail:string;
};

function clean(value:string|undefined){
  const result=(value||'').trim();
  return result||null;
}

export function getPublicLegalIdentity():PublicLegalIdentity|null{
  if(process.env.FEYA_PUBLIC_LEGAL_IDENTITY_CONFIRMED!=='true')return null;

  const legalName=clean(process.env.FEYA_PUBLIC_LEGAL_NAME);
  const line1=clean(process.env.FEYA_PUBLIC_LEGAL_ADDRESS_LINE1);
  const city=clean(process.env.FEYA_PUBLIC_LEGAL_ADDRESS_CITY);
  const postalCode=clean(process.env.FEYA_PUBLIC_LEGAL_ADDRESS_POSTAL_CODE);
  const country=clean(process.env.FEYA_PUBLIC_LEGAL_ADDRESS_COUNTRY);
  if(!legalName||!line1||!city||!postalCode||!country)return null;

  return{
    legalName,
    brandName:'TheFEYA',
    address:{
      line1,
      line2:clean(process.env.FEYA_PUBLIC_LEGAL_ADDRESS_LINE2),
      city,
      region:clean(process.env.FEYA_PUBLIC_LEGAL_ADDRESS_REGION),
      postalCode,
      country,
    },
    contactEmail:'manager.feya@gmail.com',
  };
}

export function publicLegalIdentityReady(){
  return Boolean(getPublicLegalIdentity());
}
