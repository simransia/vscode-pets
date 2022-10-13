import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import {
    PetSize,
    PetType,
    PetColor,
    Theme,
    ColorThemeKind,
    WebviewMessage,
    ALL_PETS,
    ALL_COLORS,
    ALL_SCALES,
} from '../../common/types';
import { PetElementState, PetPanelState, States } from '../../panel/states';
import * as pets from '../../panel/pets';

function mockPanelWindow() {
    const html =
        '<!doctype html><html><body><div id="petsContainer"></div><div id="foreground"></div></body></html>';

    var jsdom = require('jsdom');
    var document = new jsdom.JSDOM(html);
    var window = document.window;
    window.innerWidth = 300;

    global.document = window.document;
    global.window = window;
    window.console = global.console;
}

const baseUrl = 'https://test.com';

class MockState implements VscodeStateApi {
    counter: number = 1;
    states: Array<PetElementState> | undefined = undefined;
    sentMessages: Array<WebviewMessage> = [];

    getState(): PetPanelState | undefined {
        if (!this.states) {
            return undefined;
        }
        return {
            petCounter: this.counter,
            petStates: this.states,
        };
    }

    // eslint-disable-next-line no-unused-vars
    setState(state: PetPanelState): void {
        this.counter = state.petCounter ?? this.counter;
        this.states = state.petStates ?? this.states;
    }

    // eslint-disable-next-line no-unused-vars
    postMessage(message: WebviewMessage): void {
        this.sentMessages.push(message);
    }

    getMessages(): Array<WebviewMessage> {
        return this.sentMessages;
    }

    reset() {
        this.counter = 1;
        this.states = undefined;
    }
}

mockPanelWindow();

import * as panel from '../../panel/main';

suite('Pets Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Test pet collection', () => {
        var collection = new pets.PetCollection();
        const petImageEl = global.document.createElement(
            'image',
        ) as HTMLImageElement;
        const petDivEl = global.document.createElement('div') as HTMLDivElement;
        const petSpeechEl = global.document.createElement(
            'div',
        ) as HTMLDivElement;
        const testPet = pets.createPet(
            'cat',
            petImageEl,
            petDivEl,
            petSpeechEl,
            PetSize.medium,
            0,
            0,
            'testPet',
            0,
            'Jerry',
        );
        assert.ok(testPet instanceof pets.Cat);
        assert.equal(testPet.emoji(), '🐱');
        assert.equal(testPet.name(), 'Jerry');

        const testPetElement = new pets.PetElement(
            petImageEl,
            petDivEl,
            petSpeechEl,
            testPet,
            PetColor.brown,
            PetType.cat,
        );
        assert.strictEqual(testPetElement.color, PetColor.brown);
        assert.strictEqual(testPetElement.type, PetType.cat);

        assert.strictEqual(collection.locate('Jerry'), undefined);

        collection.push(testPetElement);
        assert.strictEqual(collection.locate('Jerry'), testPetElement);

        collection.remove('Jerry');
        assert.strictEqual(collection.locate('Jerry'), undefined);
    });

    ALL_SCALES.forEach((petSize) => {
        ALL_COLORS.forEach((petColor) => {
            ALL_PETS.forEach((petType) => {
                test(`Test panel app initialization with theme and ${petSize} ${petColor} ${petType}`, () => {
                    const mockState = new MockState();
                    panel.allPets.reset();
                    mockState.reset();
                    panel.petPanelApp(
                        baseUrl,
                        Theme.beach,
                        ColorThemeKind.dark,
                        petColor,
                        petSize,
                        petType,
                        mockState,
                    );

                    assert.notStrictEqual(
                        document.body.style.backgroundImage,
                        '',
                    );
                    assert.notStrictEqual(
                        document.getElementById('foreground')?.style
                            .backgroundImage,
                        '',
                    );

                    assert.equal(mockState.getState()?.petStates?.length, 1);

                    const firstPet: PetElementState = (mockState.getState()
                        ?.petStates ?? [])[0];
                    assert.equal(firstPet.petType, petType);
                    assert.equal(firstPet.petColor, petColor);

                    const createdPets = panel.allPets.pets();
                    assert.notEqual(createdPets.at(0), undefined);
                    const pet = createdPets.at(0);
                    assert.equal(pet?.color, petColor);
                    assert.equal(pet?.type, petType);
                    assert.notEqual(pet?.pet.width(), 0);

                    /// Cycle 1000 frames
                    for (var i = 0; i < 1000; i++) {
                        pet?.pet.nextFrame();
                        assert.equal(panel.allPets.seekNewFriends().length, 0);
                        assert.notEqual(pet?.pet.getState(), undefined);
                    }

                    // Test swipe
                    if (pet?.pet.canSwipe) {
                        pet?.pet.swipe();
                        assert.equal(
                            pet?.pet.getState().currentStateEnum,
                            States.swipe,
                        );
                        assert.notEqual(pet?.speech.innerText, '');
                        assert.equal(pet?.speech.style.display, 'block');
                        for (var i = 0; i < 1000; i++) {
                            pet?.pet.nextFrame();
                        }
                        // Check leaves swipe state
                        assert.notEqual(pet?.pet.getState(), States.swipe);
                    }

                    // Test hello
                    assert.notStrictEqual(pet?.pet.hello(), undefined);
                    assert.notStrictEqual(pet?.pet.hello(), '');
                });
            });
        });
    });

    test('Test friendships with 2 pets', () => {
        const mockState = new MockState();
        panel.allPets.reset();
        mockState.reset();
        panel.petPanelApp(
            baseUrl,
            Theme.none,
            ColorThemeKind.dark,
            PetColor.black,
            PetSize.large,
            PetType.cat,
            mockState,
        );

        panel.allPets.push(
            panel.addPetToPanel(
                PetType.cat,
                baseUrl,
                PetColor.brown,
                PetSize.large,
                10,
                0,
                0,
                'Smithy',
                mockState,
            ),
        );

        assert.equal(mockState.getState()?.petStates?.length, 1);
        const firstPetName = panel.allPets.pets()[0].pet.name();
        const createdPets = panel.allPets.pets();
        assert.equal(createdPets.length, 2);
        assert.equal(createdPets[0].pet.name(), firstPetName);
        assert.equal(createdPets[1].pet.name(), 'Smithy');

        /// Cycle 1000 frames
        for (var i = 0; i < 5000; i++) {
            createdPets[0].pet.nextFrame();
            createdPets[1].pet.nextFrame();
            const newFriendships = panel.allPets.seekNewFriends();
            if (newFriendships.length > 0) {
                break;
            }
        }
        assert.equal(createdPets[0].pet.hasFriend(), true);
        assert.notEqual(createdPets[0].pet.friend(), undefined);
        assert.equal(createdPets[0].pet.friend()?.name(), 'Smithy');
        assert.equal(createdPets[1].pet.hasFriend(), true);
        assert.notEqual(createdPets[1].pet.friend(), undefined);
        assert.equal(createdPets[0].pet.friend()?.name(), firstPetName);
    });

    test('Test panel app initialization with no theme', () => {
        const mockState = new MockState();
        panel.allPets.reset();
        mockState.reset();
        panel.petPanelApp(
            'https://test.com',
            Theme.none,
            ColorThemeKind.dark,
            PetColor.black,
            PetSize.large,
            PetType.cat,
            mockState,
        );

        assert.strictEqual(document.body.style.backgroundImage, '');
        assert.strictEqual(
            document.getElementById('foreground')?.style.backgroundImage,
            '',
        );
    });
});
