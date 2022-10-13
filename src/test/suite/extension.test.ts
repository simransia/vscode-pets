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
} from '../../common/types';

import * as extension from '../../extension/extension';

suite('Pets Test Suite', () => {
    vscode.window.showInformationMessage('Start extension tests.');

    test('Test panel app initialization with no theme', () => {
        extension.activate())
    });
});
