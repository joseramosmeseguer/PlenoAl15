import alemania from "@/assets/alemania.png";
import arabiaSaudita from "@/assets/arabia_saudita.png";
import argelia from "@/assets/argelia.png";
import argentina from "@/assets/argentina.png";
import australia from "@/assets/australia.png";
import austria from "@/assets/austria.png";
import belgica from "@/assets/belgica.png";
import bosniaYHerzegovina from "@/assets/bosnia_y_herzegovina.png";
import brasil from "@/assets/brasil.png";
import caboVerde from "@/assets/cabo_verde.png";
import canada from "@/assets/canada.png";
import chequia from "@/assets/chequia.png";
import colombia from "@/assets/colombia.png";
import coreaDelSur from "@/assets/corea_del_sur.png";
import costaDeMarfil from "@/assets/costa_de_marfil.png";
import croacia from "@/assets/croacia.png";
import curazao from "@/assets/curazao.png";
import ecuador from "@/assets/ecuador.png";
import egipto from "@/assets/egipto.png";
import escocia from "@/assets/escocia.png";
import espana from "@/assets/espana.png";
import estadosUnidos from "@/assets/estados_unidos.png";
import francia from "@/assets/francia.png";
import ghana from "@/assets/ghana.png";
import haiti from "@/assets/haiti.png";
import inglaterra from "@/assets/inglaterra.png";
import irak from "@/assets/irak.png";
import iran from "@/assets/iran.png";
import japon from "@/assets/japon.png";
import jordania from "@/assets/jordania.png";
import marruecos from "@/assets/marruecos.png";
import mexico from "@/assets/mexico.png";
import noruega from "@/assets/noruega.png";
import nuevaZelanda from "@/assets/nueva_zelanda.png";
import paisesBajos from "@/assets/paises_bajos.png";
import panama from "@/assets/panama.png";
import paraguay from "@/assets/paraguay.png";
import portugal from "@/assets/portugal.png";
import qatar from "@/assets/qatar.png";
import rdCongo from "@/assets/rd_congo.png";
import senegal from "@/assets/senegal.png";
import sudafrica from "@/assets/sudafrica.png";
import suecia from "@/assets/suecia.png";
import suiza from "@/assets/suiza.png";
import tunez from "@/assets/tunez.png";
import turquia from "@/assets/turquia.png";
import uruguay from "@/assets/uruguay.png";
import uzbekistan from "@/assets/uzbekistan.png";

export const FLAG_MAP: Record<string, string> = {
  ALG: argelia,
  ARG: argentina,
  AUS: australia,
  AUT: austria,
  BEL: belgica,
  BIH: bosniaYHerzegovina,
  BRA: brasil,
  CAN: canada,
  CIV: costaDeMarfil,
  COD: rdCongo,
  COL: colombia,
  CPV: caboVerde,
  CRO: croacia,
  CUW: curazao,
  CZE: chequia,
  ECU: ecuador,
  EGY: egipto,
  ENG: inglaterra,
  ESP: espana,
  FRA: francia,
  GER: alemania,
  GHA: ghana,
  HAI: haiti,
  IRN: iran,
  IRQ: irak,
  JOR: jordania,
  JPN: japon,
  KOR: coreaDelSur,
  KSA: arabiaSaudita,
  MAR: marruecos,
  MEX: mexico,
  NED: paisesBajos,
  NOR: noruega,
  NZL: nuevaZelanda,
  PAN: panama,
  PAR: paraguay,
  POR: portugal,
  QAT: qatar,
  RSA: sudafrica,
  SCO: escocia,
  SEN: senegal,
  SUI: suiza,
  SWE: suecia,
  TUN: tunez,
  TUR: turquia,
  URU: uruguay,
  USA: estadosUnidos,
  UZB: uzbekistan,
};

export function getFlagUrl(code: string | null | undefined): string | null {
  if (!code) return null;
  return FLAG_MAP[code.toUpperCase()] ?? null;
}
