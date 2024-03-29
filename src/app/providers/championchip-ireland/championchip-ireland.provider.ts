import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Race, RaceMap } from 'src/app/common/race';
import { IProvider } from '../provider';
import { firstValueFrom } from 'rxjs';
import { ProviderCache } from '../provider.cache';

type ChampionChipRace = {
  name: string;
  csv_data: string[][];
  csv_headers: string[];
  columns: string;
  columns_mobile: string;
};

type ChipEvent = {
  name: string;
  races: ChampionChipRace[];
};

@Injectable({ providedIn: 'root' })
export class ChampionChipIreland implements IProvider {
  constructor(private http: HttpClient, private cache: ProviderCache) {}

  public name = 'ChampionChip Ireland';

  private races!: RaceMap;

  public async getRaces(): Promise<RaceMap> {
    if (this.races) {
      return this.races;
    }

    const chipEvents = await this.getChipEvents();
    const allRaces = this.mergeRaceData(chipEvents.flatMap(this.mapRaces));

    this.races = allRaces.reduce((map, race) => {
      return map.set(race.name, async () => race);
    }, new RaceMap());

    return this.races;
  }

  private async getChipEvents(): Promise<ChipEvent[]> {
    return await firstValueFrom(this.http.get<ChipEvent[]>(`https://api.championchipireland.com/v1/chip_events?${Date.now()}`));
  }

  private mapRaces = (chipEvent: ChipEvent): Race[] => {
    const hasMultipleRaces = chipEvent.races.length > 1;

    return chipEvent.races.map((race) => ({
      name: (hasMultipleRaces ? `${chipEvent.name} - ${race.name}` : chipEvent.name).trim(),
      results: this.mapRace(race),
      headers: race.columns.split(',').map((x) => race.csv_headers[Number(x)]),
      headersMobile: race.columns_mobile.split(',').map((x) => race.csv_headers[Number(x)]),
    }));
  };

  private mapRace = (race: ChampionChipRace): any[] => {
    return race.csv_data.map((data) =>
      race.csv_headers.reduce((result: any, header, index) => {
        result[header] = data[index];
        return result;
      }, {})
    );
  };

  private mergeRaceData = (mappedRaces: Race[]): Race[] => {
    const races: { [key: string]: Race } = {};
    for (const race of mappedRaces) {
      races[race.name] = race;
    }

    const cachedRaces = this.cache.get<Race[]>(this.name, this.name) || [];
    for (const race of cachedRaces) {
      if (!races[race.name]) {
        races[race.name] = race;
      }
    }

    return this.cache.set(this.name, this.name, Object.values(races));
  };
}
