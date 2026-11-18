/** « de Nicolas », « d'Adrien » : élision devant une voyelle ou un h muet. */
export function ofName(name: string): string {
  return /^[aeiouyhàâéèêëîïôûü]/i.test(name) ? `d'${name}` : `de ${name}`;
}
