import type { Opaque } from 'type-fest';

import { Consent, ConsentImpl } from './consent';
import type { ConsentCreateParams, ConsentId } from './consent';
import type { HttpClient } from './http';
import type { IdentityId, IdentityTokenVerifier } from './identity';
import type { Model, Page, PageParams, PODModel, ResourceId, WritableExcluding } from './model';

export type AppId = Opaque<ResourceId>;

export type PODApp = PODModel & {
    acceptanceText?: string;
    admins: ResourceId[];
    brandingColor?: string;
    category?: string;
    collaborators: ResourceId[];
    extendedDescription?: string;
    homepage: string;
    invitationText?: string;
    inviteOnly: boolean;
    invites?: ResourceId[];
    logo?: string;
    name: string;
    organization: string;
    owner: ResourceId;
    participants: ResourceId[];
    privacyPolicy: string;
    published: boolean;
    rejectionText?: string;
    shortDescription: string;
    termsAndConditions: string;
};

export class App implements Model {
    public id: AppId;
    public createdAt: Date;

    /** The Identity that created the app. */
    public owner: IdentityId;
    public admins: IdentityId[];
    /** Identities that can view participation of the app and modify un-privileged fields. */
    public collaborators: IdentityId[];

    /** Whether this app has been published. Consents may not be modified after publishing, */
    public published: boolean;
    /** If `true`, only invited Identities may  the app. */
    public inviteOnly: boolean;
    /** Identities invited to participate in this app. */
    public invites: IdentityId[];
    /** The set of identities that are currently authorizing this app. */
    public participants: IdentityId[];

    public name: string;
    /** The name of the app publisher's organization. */
    public organization: string;
    public shortDescription: string;
    /** The app publisher's homepage URL. */
    public homepage: string;
    /** The privacy policy presented to the user when joining the app. */
    public privacyPolicy: string;
    /** The terms and conditions presented to the user when joining the app. */
    public termsAndConditions: string;

    /** Text shown to the user when viewing the app's invite page. */
    public invitationText?: string;
    /** Text shown to the user after accepting the app's invitation. */
    public acceptanceText?: string;
    /** Text shown to the user after rejecting the app's invitation. */
    public rejectionText?: string;

    public extendedDescription?: string;
    /** The app's branding color in RGB hex format (e.g. `#ff4212`). */
    public brandingColor?: string;
    /**
     * Text describing the category of the app (e.g., health, finance) that can
     * be used to search for the app.
     */
    public category?: string;
    /** A URL pointing to (or containing) the app's logo. */
    public logo?: string;

    public constructor(private readonly client: HttpClient, pod: PODApp) {
        this.acceptanceText = pod.acceptanceText;
        this.admins = pod.admins as IdentityId[];
        this.brandingColor = pod.brandingColor;
        this.category = pod.category;
        this.collaborators = pod.collaborators as IdentityId[];
        this.createdAt = new Date(pod.createdAt);
        this.owner = pod.owner as IdentityId;
        this.extendedDescription = pod.extendedDescription;
        this.homepage = pod.homepage;
        this.id = pod.id as AppId;
        this.invites = pod.invites as IdentityId[];
        this.invitationText = pod.invitationText;
        this.inviteOnly = pod.inviteOnly;
        this.name = pod.name;
        this.organization = pod.organization;
        this.participants = pod.participants as IdentityId[];
        this.privacyPolicy = pod.privacyPolicy;
        this.published = pod.published;
        this.rejectionText = pod.rejectionText;
        this.shortDescription = pod.shortDescription;
        this.termsAndConditions = pod.termsAndConditions;
        this.logo = pod.logo;
    }

    public async update(params: AppUpdateParams): Promise<App> {
        Object.assign(this, await AppImpl.update(this.client, this.id, params));
        return this;
    }

    public async delete(): Promise<void> {
        return AppImpl.delete_(this.client, this.id);
    }

    /**
     * Creates a new consent that this app will request from users. The new consent
     * will be added to `this.consents`.
     */
    public async createConsent(params: ConsentCreateParams): Promise<Consent> {
        return ConsentImpl.create(this.client, this.id, params);
    }

    /**
     * Returns the consents associated with this app.
     */
    public async listConsents(): Promise<Page<Consent>> {
        return ConsentImpl.list(this.client, this.id);
    }

    /**
     * Deletes a consent from this app, revoking any access made by granting consent.
     * will be removed from `this.consents`.
     */
    public async deleteConsent(consentId: ConsentId): Promise<void> {
        return ConsentImpl.delete_(this.client, this.id, consentId);
    }
}

export namespace AppImpl {
    export async function create(client: HttpClient, params: AppCreateParams): Promise<App> {
        return client.create<PODApp>(APPS_EP, params).then((podApp) => new App(client, podApp));
    }

    export async function get(client: HttpClient, id: AppId): Promise<App> {
        return client.get<PODApp>(endpointForId(id)).then((podApp) => new App(client, podApp));
    }

    export async function list(
        client: HttpClient,
        filter?: ListAppsFilter & PageParams,
    ): Promise<Page<App>> {
        const podPage = await client.get<Page<PODApp>>(APPS_EP, filter);
        const results = podPage.results.map((podApp) => new App(client, podApp));
        return {
            results,
            nextPageToken: podPage.nextPageToken,
        };
    }

    export async function update(
        client: HttpClient,
        id: AppId,
        params: AppUpdateParams,
    ): Promise<App> {
        return client
            .update<PODApp>(endpointForId(id), params)
            .then((podApp) => new App(client, podApp));
    }

    export async function delete_(client: HttpClient, id: AppId): Promise<void> {
        return client.delete(endpointForId(id));
    }
}

const APPS_EP = '/apps';
const endpointForId = (id: AppId) => `/apps/${id}`;

export type AppCreateParams =
    | AppUpdateParams
    | {
          /** The credentials used to authorize clients acting as this app. */
          identityTokenVerifiers: IdentityTokenVerifier[];
      };

export type AppUpdateParams = WritableExcluding<App, 'participants'>;

export type ListAppsFilter = Partial<{
    /** Only return Apps owned by the provided Identity. */
    owner: IdentityId;

    /** Only return Apps for which the requester has the specified participation status. */
    participation: AppParticipation;
}>;

export type AppParticipation = 'invited' | 'joined';
