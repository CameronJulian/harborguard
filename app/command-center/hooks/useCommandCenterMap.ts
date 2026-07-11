import { useEffect, useState } from "react";

import type { FleetVehicle } from "../types";

import {
  cleanLatLng,
  movementStatus,
  riskColor,
  vehicleRisk,
} from "../utils";

function lerp(a:number,b:number,t:number){
  return a+(b-a)*t;
}

function interpolatePosition(
  start:[number,number],
  end:[number,number],
  t:number
):[number,number]{
  return [
    lerp(start[0],end[0],t),
    lerp(start[1],end[1],t),
  ];
}

async function createVehicleIcon(
  risk:string,
  selected:boolean,
  heading:number=0,
  status="Stopped"
){

  const L=(await import("leaflet")).default;

  const color=riskColor(risk);
  const size=selected?36:28;
  const coreSize=selected?30:22;

  const isLive=
    risk!=="offline" &&
    status!=="Stale";

  return L.divIcon({
    className:"",
    html:`
<div style="
position:relative;
width:${size}px;
height:${size}px;
">
<div style="
position:absolute;
left:50%;
top:50%;
width:${coreSize}px;
height:${coreSize}px;
margin-left:-${coreSize/2}px;
margin-top:-${coreSize/2}px;
border-radius:9999px;
background:${color};
opacity:${isLive?1:0.5};
transform:rotate(${heading}deg);
"></div>
</div>
`,
    iconSize:[size,size],
    iconAnchor:[size/2,size/2],
  });

}

export function useCommandCenterMap(
  fleet:FleetVehicle[],
  selectedVehicleId:string|null
){

  const [
    animatedPositions,
    setAnimatedPositions
  ]=useState<
    Record<string,[number,number]>
  >({});

  const [
    icons,
    setIcons
  ]=useState<Record<string,any>>({});

  useEffect(()=>{

    let cancelled=false;

    async function buildIcons(){

      const next:Record<string,any>={};

      for(const vehicle of fleet){

        next[vehicle.id]=await createVehicleIcon(
          vehicleRisk(vehicle),
          selectedVehicleId===vehicle.id,
          Number(vehicle.heading||0),
          movementStatus(vehicle)
        );

      }

      if(!cancelled){
        setIcons(next);
      }

    }

    buildIcons();

    return ()=>{
      cancelled=true;
    };

  },[fleet,selectedVehicleId]);

  useEffect(()=>{

    const interval=setInterval(()=>{

      setAnimatedPositions(prev=>{

        const next:Record<
          string,
          [number,number]
        >={};

        fleet.forEach(vehicle=>{

          const coords=cleanLatLng(
            vehicle.latitude,
            vehicle.longitude
          );

          if(!coords){
            return;
          }

          const previous=prev[vehicle.id];

          next[vehicle.id]=
            previous
            ?interpolatePosition(previous,coords,0.18)
            :coords;

        });

        return next;

      });

    },80);

    return ()=>clearInterval(interval);

  },[fleet]);

  return{
    animatedPositions,
    icons,
  };

}
