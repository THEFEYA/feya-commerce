'use client';

import {useId} from 'react';
import {
  Crown,Search,FileText,ShieldCheck,Code2,ChartNoAxesCombined,
  Database,ShoppingBag,UserRound,
} from 'lucide-react';
import type {MissionRoleCode} from '@/lib/owner-ui/missionControlProjection';
import styles from './MissionRobotPortrait.module.css';

const icons={
  GROWTH_DIRECTOR:Crown,OSPM:Search,SCO:FileText,CQA:ShieldCheck,
  TSEO:Code2,GMEL:ChartNoAxesCombined,GDAE:Database,CPIM:ShoppingBag,OWNER:UserRound,
};

/**
 * Original lightweight vector character with metallic gradients, role-color
 * identity and a static glow. A character is NOT proof of an executing AI agent.
 */
export function MissionRobotPortrait({role,large=false}:{
  role:MissionRoleCode|'OWNER';large?:boolean;
}){
  const id=useId().replace(/:/g,'');
  const Icon=icons[role];
  if(role==='OWNER')return <span className={styles.avatar} data-role={role}
    data-large={large?'true':undefined} aria-hidden="true">
      <span className={styles.ownerHalo}/>
      <svg viewBox="0 0 130 118" role="presentation" aria-hidden="true">
        <defs>
          <radialGradient id={id+'owner'} cx="35%" cy="20%">
            <stop stopColor="#ffe8ad"/><stop offset=".6" stopColor="#c79645"/>
            <stop offset="1" stopColor="#534124"/>
          </radialGradient>
          <linearGradient id={id+'ownerBody'} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f5cf81"/><stop offset=".55" stopColor="#87612d"/><stop offset="1" stopColor="#2a2830"/>
          </linearGradient>
        </defs>
        <ellipse cx="64" cy="108" rx="37" ry="8" fill="#e4b16a" opacity=".14"/>
        <path d="M35 100Q27 70 47 60Q62 52 82 62Q102 76 94 101Z"
          fill={'url(#'+id+'ownerBody)'} stroke="#f1dca6" strokeWidth="1.6"/>
        <rect x="37" y="22" width="56" height="53" rx="22"
          fill={'url(#'+id+'owner)'} stroke="#ffe1a2" strokeWidth="1.8"/>
        <path d="M46 48Q65 41 83 48" stroke="#614722" strokeWidth="2.5" fill="none"/>
        <circle cx="52" cy="45" r="3.1" fill="#162336"/><circle cx="78" cy="45" r="3.1" fill="#162336"/>
        <path d="M55 58Q65 64 75 58" stroke="#4e3c2a" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M46 20L40 10 56 16 65 4 75 16 91 10 84 22Z"
          fill="#f7d384" stroke="#fff0c1" strokeWidth="1.3"/>
        <circle cx="65" cy="15" r="3" fill="#fff2bb"/>
        <circle cx="65" cy="86" r="11" fill="#202638" stroke="#f3d99f" strokeWidth="1.4"/>
        <path d="M60 86L64 90L71 81" fill="none" stroke="#f6ce80" strokeWidth="2"/>
      </svg>
      <span className={styles.specialty}><Icon size={13} strokeWidth={2}/></span>
    </span>;

  return <span className={styles.avatar} data-role={role}
    data-large={large?'true':undefined} aria-hidden="true">
    <span className={styles.halo}/>
    <svg viewBox="0 0 130 118" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id={id+'chrome'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f9ffff"/>
          <stop offset=".19" stopColor="#b7dafa"/>
          <stop offset=".44" stopColor="#627fac"/>
          <stop offset=".7" stopColor="#d1ecff"/>
          <stop offset="1" stopColor="#365078"/>
        </linearGradient>
        <linearGradient id={id+'face'} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#1d3355"/><stop offset=".45" stopColor="#050b1e"/>
          <stop offset="1" stopColor="#0c1731"/>
        </linearGradient>
        <linearGradient id={id+'torso'} x1="0" y1="0" x2=".7" y2="1">
          <stop stopColor="#e9f7ff"/><stop offset=".5" stopColor="#6585b3"/>
          <stop offset="1" stopColor="#263b64"/>
        </linearGradient>
        <radialGradient id={id+'blue'} cx=".28" cy=".17">
          <stop stopColor="#fff"/><stop offset=".4" stopColor="#c3ebff"/>
          <stop offset="1" stopColor="#3d6eaa"/>
        </radialGradient>
      </defs>
      <ellipse cx="65" cy="109" rx="43" ry="8" fill="currentColor" opacity=".16"/>
      <path d="M37 100Q30 80 46 70Q65 62 84 70Q101 80 93 100Z"
        fill={'url(#'+id+'torso)'} stroke="#b8ddf9" strokeWidth="1.5"/>
      <path d="M36 87L25 90 28 99 40 95M94 87L105 90 102 99 90 95"
        fill="#95bee3" stroke="#e3f7ff" strokeWidth="1.3"/>
      <path d="M65 18V11" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="65" cy="9" r="5" fill="currentColor" stroke="#e9f8ff" strokeWidth=".8"/>
      <rect x="30" y="18" width="70" height="61" rx="27"
        fill={'url(#'+id+'chrome)'} stroke="#e1f3ff" strokeWidth="2"/>
      <path d="M35 35Q53 22 82 30" stroke="#fff" strokeWidth="2.1" fill="none" opacity=".74"/>
      <rect x="21" y="38" width="12" height="23" rx="6" fill="#456da2" stroke="#c6eaff" strokeWidth="1.5"/>
      <rect x="97" y="38" width="12" height="23" rx="6" fill="#456da2" stroke="#c6eaff" strokeWidth="1.5"/>
      <rect x="37" y="39" width="56" height="29" rx="13"
        fill={'url(#'+id+'face)'} stroke="#8ebbe5" strokeWidth="1.8"/>
      <path d="M42 45Q56 39 69 42" stroke="#8cb5db" strokeWidth="1" fill="none" opacity=".55"/>
      <rect x="48" y="48" width="10" height="13" rx="5" fill="currentColor"/>
      <rect x="72" y="48" width="10" height="13" rx="5" fill="currentColor"/>
      <circle cx="51" cy="51" r="2.8" fill="#fff" opacity=".89"/>
      <circle cx="75" cy="51" r="2.8" fill="#fff" opacity=".89"/>
      <path d="M59 65Q65 68 71 65" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".65"/>
      <circle cx="65" cy="85" r="12" fill="#172644" stroke="#c0eaff" strokeWidth="1.4"/>
      <path d="M54 85A11 11 0 0 1 76 85" fill="none" stroke="currentColor" strokeWidth="2.3"/>
      <path d="M45 97Q65 104 85 97" fill="none" stroke="#ddf2ff" strokeWidth="1.3" opacity=".53"/>
    </svg>
    <span className={styles.specialty}><Icon size={13} strokeWidth={2}/></span>
  </span>;
}
