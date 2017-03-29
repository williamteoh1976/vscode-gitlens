'use strict';
import { MessageItem, window } from 'vscode';
import { GitService, GitStashCommit } from '../gitService';
import { Command, Commands } from './common';
import { CommitQuickPickItem, StashListQuickPick } from '../quickPicks';
import { Logger } from '../logger';

export class StashApplyCommand extends Command {

    constructor(private git: GitService) {
        super(Commands.StashApply);
    }

    async execute(stashItem: { stashName: string, message: string }, confirm: boolean = true, deleteAfter: boolean = false) {
        if (!this.git.config.insiders) return undefined;

        if (!stashItem || !stashItem.stashName) {
            const stash = await this.git.getStashList(this.git.repoPath);
            if (!stash) return window.showInformationMessage(`There are no stashed changes`);

            const pick = await StashListQuickPick.show(stash, 'Apply stashed changes to your working tree\u2026');
            if (!pick || !(pick instanceof CommitQuickPickItem)) return undefined;

            stashItem = pick.commit as GitStashCommit;
        }

        try {
            if (confirm) {
                const message = stashItem.message.length > 80 ? `${stashItem.message.substring(0, 80)}\u2026` : stashItem.message;
                const result = await window.showWarningMessage(`Apply stashed changes '${message}' to your working tree?`, { title: 'Yes, delete after applying' } as MessageItem, { title: 'Yes' } as MessageItem, { title: 'No', isCloseAffordance: true } as MessageItem);
                if (!result || result.title === 'No') return undefined;

                deleteAfter = result.title !== 'Yes';
            }

            return await this.git.stashApply(this.git.repoPath, stashItem.stashName, deleteAfter);
        }
        catch (ex) {
            Logger.error(ex, 'StashApplyCommand');
            if (ex.message.includes('Your local changes to the following files would be overwritten by merge')) {
                return window.showErrorMessage(`Unable to apply stash. Your working tree changes would be overwritten.`);
            }
            else {
                return window.showErrorMessage(`Unable to apply stash. See output channel for more details`);
            }
        }
    }
}