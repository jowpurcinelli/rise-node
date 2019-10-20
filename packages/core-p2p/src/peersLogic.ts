import {
  AppConfig,
  BasePeerType,
  ILogger,
  ISystemModule,
  PeerState,
  PeerType,
  Symbols,
} from '@risevision/core-types';
import { inject, injectable } from 'inversify';
import * as ip from 'ip';
import * as _ from 'lodash';
import { P2pConfig, p2pSymbols } from './helpers';
import { Peer } from './peer';

@injectable()
export class PeersLogic {
  @inject(Symbols.helpers.logger)
  private logger: ILogger;

  private peers: { [peerIdentifier: string]: Peer } = {};

  private lastRemoved: { [peerIdentifier: string]: number } = {};

  @inject(p2pSymbols.logic.peerFactory)
  private peersFactory: (bp: BasePeerType) => Peer;

  @inject(Symbols.modules.system)
  private systemModule: ISystemModule;

  @inject(Symbols.generic.appConfig)
  private config: P2pConfig;

  public create(peer: BasePeerType): Peer {
    if (!(peer instanceof Peer)) {
      return this.peersFactory(peer);
    }
    return peer as any;
  }

  /**
   * Checks if peer is in list
   */
  public exists(peer: BasePeerType): boolean {
    const thePeer = this.create(peer);
    return typeof this.peers[thePeer.string] !== 'undefined';
  }

  public get(peer: PeerType | string) {
    if (typeof peer === 'string') {
      return this.peers[peer];
    }
    return this.peers[this.create(peer).string];
  }

  public upsert(peer: PeerType, insertOnly: boolean) {
    const thePeer = this.create(peer);
    if (this.exists(thePeer)) {
      if (insertOnly) {
        return false;
      }
      // Update peer.
      thePeer.updated = Date.now();
      const diff = {};
      Object.keys(peer)
        .filter((k) => k !== 'updated')
        .filter((k) => this.peers[thePeer.string][k] !== thePeer[k])
        .forEach((k: string) => (diff[k] = thePeer[k]));

      this.peers[thePeer.string].update(thePeer);

      if (Object.keys(diff).length) {
        this.logger.debug(`Updated peer ${thePeer.string}`, diff);
      } else {
        this.logger.trace('Peer not changed', thePeer.string);
      }
    } else {
      // Do not add peer if it was removed recently
      if (this.wasRecentlyRemoved(thePeer)) {
        this.logger.debug('Rejecting recently removed peer', thePeer.string);
        return false;
      }
      // insert peer!
      // TODO fix
      if (!_.isEmpty(this.acceptable([thePeer]))) {
        thePeer.updated = Date.now();
        this.peers[thePeer.string] = thePeer;
        this.logger.debug('Inserted new peer', thePeer.string);
      } else {
        this.logger.debug(
          'Rejecting unacceptable peer',
          thePeer.string + ' v' + thePeer.version
        );
      }
    }

    const stats = {
      alive: 0,
      emptyBroadhash: 0,
      emptyHeight: 0,
      total: 0,
    };

    Object.keys(this.peers)
      .map((key) => this.peers[key])
      .forEach((p) => {
        stats.total++;

        if (p.state === PeerState.CONNECTED) {
          stats.alive++;
        }
        if (!p.height) {
          stats.emptyHeight++;
        }
        if (!p.broadhash) {
          stats.emptyBroadhash++;
        }
      });

    this.logger.trace('PeerStats', stats);

    return true;
  }

  public remove(peer: BasePeerType): boolean {
    if (this.exists(peer)) {
      const thePeer = this.create(peer);
      this.logger.info('Removed peer', thePeer.string);
      // this.logger.debug('Removed peer', this.peers[thePeer.string]);
      this.lastRemoved[thePeer.string] = Date.now();
      delete this.peers[thePeer.string];
      return true;
    }

    this.logger.debug('Failed to remove peer', { err: 'AREMOVED', peer });
    return false;
  }

  public list(normalize: true): PeerType[];
  public list(normalize: false): Peer[];
  public list(normalize: boolean) {
    return Object.keys(this.peers)
      .map((k) => this.peers[k])
      .map((peer) => (normalize ? peer.object() : peer));
  }

  /**
   * Filters peers with private ips, same nonce or incompatible version
   */
  public acceptable(peers: Peer[]): Peer[];
  public acceptable(peers: PeerType[]): PeerType[];
  public acceptable(peers: PeerType[] | Peer[]): PeerType[] | Peer[] {
    return _(peers)
      .uniqWith((a, b) => `${a.ip}` === `${b.ip}`)
      .filter((peer) => {
        if ((process.env.NODE_ENV || '').toUpperCase() === 'TEST') {
          return peer.nonce !== this.systemModule.getNonce();
        }
        return (
          // !ip.isPrivate(peer.ip) &&
          peer.nonce !== this.systemModule.getNonce() &&
          peer.ip !== '0.0.0.0' &&
          peer.os !== 'lisk-js-api'
        );
      })
      .filter((peer) => this.systemModule.versionCompatible(peer.version))
      .value();
  }

  /**
   * Returns true if peer was last removed less than 15 minutes ago.
   * @param {IPeerLogic} thePeer
   * @returns {boolean}
   */
  private wasRecentlyRemoved(thePeer: Peer) {
    if (typeof this.lastRemoved[thePeer.string] === 'undefined') {
      return false;
    }
    return (
      Date.now() - this.lastRemoved[thePeer.string] < this.config.peers.banTime
    );
  }
}
